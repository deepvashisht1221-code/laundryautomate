import { useCallback, useEffect, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/Skeleton";
import { InlineError } from "@/components/InlineError";

type PlanRow = Tables<"user_plans"> & { plans: Tables<"plans"> };
type QuotaOrder = Pick<Tables<"orders">, "id" | "order_code" | "weight_kg" | "created_at">;

const MOST_POPULAR = "Regular";

function computePeriodStart(startsOn: string): Date {
  const start = new Date(startsOn);
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth(), start.getDate());
  if (periodStart > today) periodStart.setMonth(periodStart.getMonth() - 1);
  return periodStart;
}

function computeRenewalDate(startsOn: string, endsOn: string | null): Date {
  if (endsOn) return new Date(endsOn);
  const periodStart = computePeriodStart(startsOn);
  const renewal = new Date(periodStart);
  renewal.setMonth(renewal.getMonth() + 1);
  return renewal;
}

function QuotaRing({ used, total }: { used: number; total: number }) {
  const size = 128;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, total > 0 ? used / total : 0));
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--line)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        className="fill-ink font-display text-[22px] font-bold"
      >
        {used.toFixed(1)}
      </text>
      <text x="50%" y="63%" textAnchor="middle" className="fill-muted text-[11px]">
        of {total} kg
      </text>
    </svg>
  );
}

export function Plan() {
  const { user } = useAuth();
  const [planRow, setPlanRow] = useState<PlanRow | null>(null);
  const [allPlans, setAllPlans] = useState<Tables<"plans">[] | null>(null);
  const [services, setServices] = useState<Tables<"service_types">[] | null>(null);
  const [quotaOrders, setQuotaOrders] = useState<QuotaOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<Tables<"plans"> | "payg" | null>(null);
  const [switching, setSwitching] = useState(false);
  const [switchDone, setSwitchDone] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(false);

    const [planRes, allPlansRes, servicesRes] = await Promise.all([
      supabase
        .from("user_plans")
        .select("*, plans(*)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase.from("plans").select("*").order("price"),
      supabase.from("service_types").select("*").eq("is_active", true).order("price"),
    ]);

    if (planRes.error || allPlansRes.error || servicesRes.error) {
      setError(true);
      setLoading(false);
      return;
    }

    const activePlan = (planRes.data as PlanRow | null) ?? null;
    setPlanRow(activePlan);
    setAllPlans(allPlansRes.data ?? []);
    setServices(servicesRes.data ?? []);

    if (activePlan) {
      const periodStart = computePeriodStart(activePlan.starts_on);
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_code, weight_kg, created_at")
        .eq("user_id", user.id)
        .eq("payment_status", "covered_by_plan")
        .gte("created_at", periodStart.toISOString())
        .order("created_at", { ascending: false });
      setQuotaOrders(orders ?? []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirmSwitch() {
    if (!user || !confirmTarget) return;
    setSwitching(true);

    if (planRow) {
      await supabase
        .from("user_plans")
        .update({ is_active: false, ends_on: format(new Date(), "yyyy-MM-dd") })
        .eq("id", planRow.id);
    }

    if (confirmTarget !== "payg") {
      // TODO: payment gateway integration goes here — charge confirmTarget.price
      // before activating the plan. This demo just writes the subscription
      // change directly with no real payment processed.
      await supabase.from("user_plans").insert({
        user_id: user.id,
        plan_id: confirmTarget.id,
        starts_on: format(new Date(), "yyyy-MM-dd"),
        quota_used_kg: 0,
        is_active: true,
      });
    }

    setSwitching(false);
    setSwitchDone(true);
  }

  function closeConfirm() {
    setConfirmTarget(null);
    setSwitchDone(false);
    if (switchDone) window.location.reload();
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-[180px] w-full rounded-card" />
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-24 w-full rounded-card" />
      </div>
    );
  }

  if (error) {
    return <InlineError message="Couldn't load your plan." onRetry={load} />;
  }

  const quotaRemaining = planRow
    ? (planRow.plans.monthly_quota_kg ?? 0) - planRow.quota_used_kg
    : 0;
  const renewalDate = planRow
    ? computeRenewalDate(planRow.starts_on, planRow.ends_on)
    : null;
  const daysRemaining = renewalDate ? differenceInCalendarDays(renewalDate, new Date()) : 0;

  const perKgServices = (services ?? []).filter((s) => s.pricing_unit === "per_kg");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-bold text-ink">Plan</h1>

      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40"
          onClick={closeConfirm}
        >
          <div
            className="w-full max-w-app rounded-t-card bg-card p-5 shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            {switchDone ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-lg font-semibold text-ink">
                  {confirmTarget === "payg"
                    ? "You're on pay as you go"
                    : `You're on ${confirmTarget.name}`}
                </p>
                <p className="text-sm text-muted">
                  This is a demo — no payment was actually processed.
                </p>
                <button
                  type="button"
                  onClick={closeConfirm}
                  className="mt-4 h-11 w-full rounded-control bg-primary text-sm font-semibold text-primary-foreground"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-ink">
                  {confirmTarget === "payg" ? "Switch to pay as you go?" : "Confirm your plan"}
                </h2>
                <p className="mt-2 text-sm text-ink">
                  {confirmTarget === "payg"
                    ? "You'll pay standard per-kg rates with no monthly commitment."
                    : `${confirmTarget.name} · ₹${confirmTarget.price}/${confirmTarget.billing_period === "monthly" ? "month" : "semester"}`}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {confirmTarget === "payg"
                    ? "Switching takes effect immediately. Any unused quota on your current plan is forfeited."
                    : "This is a demo checkout — no real payment will be charged. Switching takes effect immediately, and any unused quota on your current plan is forfeited."}
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleConfirmSwitch();
                    }}
                    disabled={switching}
                    className="h-11 w-full rounded-control bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-70"
                  >
                    {switching ? "Confirming…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={closeConfirm}
                    className="h-11 w-full rounded-control border border-line text-sm font-semibold text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {planRow && (
        <div className="rounded-card border border-line bg-card p-5">
          <div className="flex items-center gap-5">
            <QuotaRing used={planRow.quota_used_kg} total={planRow.plans.monthly_quota_kg ?? 0} />
            <div className="flex-1">
              <p className="text-base font-semibold text-ink">{planRow.plans.name}</p>
              <p className="mt-1 text-sm text-muted">
                {quotaRemaining.toFixed(1)} kg left this period
              </p>
              <p className="mt-2 text-sm text-ink">
                {daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining
              </p>
              {renewalDate && (
                <p className="text-sm text-muted">Renews {format(renewalDate, "MMM d")}</p>
              )}
            </div>
          </div>

          {quotaOrders.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-xs font-semibold uppercase text-muted">This period</p>
              <div className="mt-1 flex flex-col divide-y divide-line">
                {quotaOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-2">
                    <span className="text-sm text-ink">{o.order_code}</span>
                    <span className="text-sm text-muted">
                      {o.weight_kg != null ? `${o.weight_kg} kg` : "Pending weigh-in"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {!planRow && <p className="text-sm font-semibold text-ink">Choose a plan</p>}
        {(allPlans ?? []).map((plan) => {
          const isCurrent = planRow?.plan_id === plan.id;
          const effectiveRate =
            plan.monthly_quota_kg != null ? (plan.price / plan.monthly_quota_kg).toFixed(0) : null;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-card border p-4",
                isCurrent ? "border-primary bg-primary-soft" : "border-line bg-card",
              )}
            >
              {plan.name === MOST_POPULAR && !isCurrent && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-ink">
                  Most popular
                </span>
              )}
              <p className="text-base font-semibold text-ink">{plan.name}</p>
              <p className="mt-0.5 text-sm text-muted">
                {plan.monthly_quota_kg} kg/month · ₹{plan.price}
                {effectiveRate ? ` · ~₹${effectiveRate}/kg` : ""}
              </p>
              {plan.perks.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="text-sm text-ink">
                      · {perk}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3">
                {isCurrent ? (
                  <span className="text-sm font-semibold text-primary">Your plan</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmTarget(plan)}
                    className="h-11 rounded-control border border-primary px-4 text-sm font-semibold text-primary"
                  >
                    {planRow ? "Switch to this" : "Choose plan"}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="rounded-card border border-line bg-card p-4">
          <p className="text-base font-semibold text-ink">Pay as you go</p>
          <p className="mt-0.5 text-sm text-muted">No monthly commitment</p>
          <ul className="mt-2 flex flex-col gap-1">
            {perKgServices.map((s) => (
              <li key={s.id} className="text-sm text-ink">
                · {s.name}: ₹{s.price}/kg
              </li>
            ))}
          </ul>
          <div className="mt-3">
            {!planRow ? (
              <span className="text-sm font-semibold text-primary">You&apos;re on this plan</span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmTarget("payg")}
                className="h-11 rounded-control border border-primary px-4 text-sm font-semibold text-primary"
              >
                Switch to this
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-card bg-primary-soft p-4">
        <p className="text-sm font-semibold text-ink">Good to know</p>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink">
          <li>· If you go over your quota, the extra weight is charged per kg at the standard rate.</li>
          <li>· Unused quota doesn&apos;t roll over to the next period.</li>
          <li>· You can cancel or switch plans anytime from this screen — changes take effect immediately.</li>
        </ul>
      </div>
    </div>
  );
}
