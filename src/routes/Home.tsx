import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Package, Truck, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";
import {
  formatClock,
  formatDayLabel,
  formatSlotWindow,
  nextMilestoneText,
  relevantAt,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { OrderStubCard } from "@/components/OrderStubCard";
import { Skeleton } from "@/components/Skeleton";
import { InlineError } from "@/components/InlineError";
import { saveCache, loadCache } from "@/lib/offlineCache";
import { useRegisterRefresh } from "@/lib/refresh-context";

type OrderRow = Tables<"orders"> & {
  service_types: { name: string } | null;
  slots: { date: string; start_time: string; end_time: string; block: string } | null;
};

type PlanRow = Tables<"user_plans"> & { plans: Tables<"plans"> };

const NOTICE_DISMISS_KEY = "dhobisb.dismissedNoticeId";
const ORDERS_CACHE_KEY = "home.orders";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type UpcomingRow = {
  key: string;
  date: Date;
  kind: "pickup" | "delivery";
  timeLabel: string;
  scheduled: boolean;
  orderCode: string;
};

export function Home() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [planRow, setPlanRow] = useState<PlanRow | null>(null);
  const [nextSlot, setNextSlot] = useState<Tables<"slots"> | null>(null);
  const [notice, setNotice] = useState<Tables<"notices"> | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showingCached, setShowingCached] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const fetchHome = useCallback(async () => {
    if (!user || !profile) return;
    setError(false);
    const today = new Date().toISOString().slice(0, 10);

    const [ordersRes, unreadRes, planRes, slotRes, noticeRes] = await Promise.all([
      supabase
        .from("orders")
        .select("*, service_types(name), slots(date, start_time, end_time, block)")
        .eq("user_id", user.id)
        .not("status", "in", "(delivered,cancelled)"),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
      supabase
        .from("user_plans")
        .select("*, plans(*)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
      profile.village
        ? supabase
            .from("slots")
            .select("*")
            .eq("village", profile.village)
            .not("partner_id", "is", null)
            .eq("is_open", true)
            .gte("date", today)
            .order("date")
            .order("start_time")
            .limit(30)
        : Promise.resolve({ data: [] as Tables<"slots">[] }),
      profile.block
        ? supabase
            .from("notices")
            .select("*")
            .eq("is_active", true)
            .or(`block.is.null,block.eq.${profile.block}`)
            .order("created_at", { ascending: false })
            .limit(1)
        : Promise.resolve({ data: [] as Tables<"notices">[] }),
    ]);

    if (ordersRes.error) {
      const cached = loadCache<OrderRow[]>(ORDERS_CACHE_KEY);
      if (cached) {
        setOrders(cached.data);
        setShowingCached(true);
      } else {
        setError(true);
      }
      return;
    }

    const sortedOrders = ((ordersRes.data as OrderRow[] | null) ?? []).sort(
      (a, b) => relevantAt(a).getTime() - relevantAt(b).getTime(),
    );
    setOrders(sortedOrders);
    setShowingCached(false);
    saveCache(ORDERS_CACHE_KEY, sortedOrders);

    setUnreadCount(unreadRes.count ?? 0);
    setPlanRow((planRes.data as PlanRow | null) ?? null);

    const openSlot = (slotRes.data ?? []).find((s) => s.booked_count < s.capacity);
    setNextSlot(openSlot ?? null);

    const foundNotice = (noticeRes.data ?? [])[0] ?? null;
    setNotice(foundNotice);
    try {
      if (foundNotice && localStorage.getItem(NOTICE_DISMISS_KEY) === foundNotice.id) {
        setNoticeDismissed(true);
      }
    } catch {
      // localStorage unavailable — just show the notice
    }
  }, [user, profile]);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchHome();
    setLoading(false);
  }, [fetchHome]);

  useEffect(() => {
    load();
  }, [load]);

  useRegisterRefresh(fetchHome);

  const upcoming = useMemo<UpcomingRow[]>(() => {
    if (!orders) return [];
    const rows: UpcomingRow[] = [];

    for (const order of orders) {
      if ((order.status === "scheduled" || order.status === "awaiting_pickup") && order.pickup_at) {
        const date = new Date(order.pickup_at);
        rows.push({
          key: `${order.id}-pickup`,
          date,
          kind: "pickup",
          timeLabel: order.slots
            ? formatSlotWindow(order.slots.start_time, order.slots.end_time)
            : formatClock(date),
          scheduled: true,
          orderCode: order.order_code,
        });
      }
      if (order.estimated_delivery_at) {
        const date = new Date(order.estimated_delivery_at);
        rows.push({
          key: `${order.id}-delivery`,
          date,
          kind: "delivery",
          timeLabel: formatClock(date),
          scheduled: false,
          orderCode: order.order_code,
        });
      }
    }

    return rows.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 4);
  }, [orders]);

  function dismissNotice() {
    setNoticeDismissed(true);
    try {
      if (notice) localStorage.setItem(NOTICE_DISMISS_KEY, notice.id);
    } catch {
      // ignore
    }
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || !orders) return;
    const itemWidth = el.clientWidth * 0.88 + 12;
    const index = Math.round(el.scrollLeft / itemWidth);
    setActiveIndex(Math.min(Math.max(index, 0), orders.length - 1));
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-[140px] w-full rounded-card" />
        <Skeleton className="h-[52px] w-full rounded-control" />
        <Skeleton className="h-[68px] w-full rounded-card" />
      </div>
    );
  }

  if (error) {
    return <InlineError message="Couldn't load your home screen." onRetry={load} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {showingCached && (
        <p className="-mb-2 text-center text-xs text-muted">
          Showing your last saved status.
        </p>
      )}

      {notice && !noticeDismissed && (
        <div className="-mx-screen -mt-screen flex items-start gap-3 border-b-2 border-warning bg-warning/15 px-screen py-3">
          <p className="flex-1 text-sm text-ink">{notice.message}</p>
          <button
            type="button"
            onClick={dismissNotice}
            aria-label="Dismiss notice"
            className="mt-0.5 text-muted"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">
          {getGreeting()}, {firstName}
        </h1>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          onClick={() => navigate("/notifications")}
          className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-primary-soft"
        >
          <Bell size={22} className="text-ink" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {orders && orders.length > 0 ? (
        <div>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="no-scrollbar -mx-screen flex snap-x snap-mandatory gap-3 overflow-x-auto px-screen pb-1"
          >
            {orders.map((order) => (
              <OrderStubCard
                key={order.id}
                orderId={order.id}
                orderCode={order.order_code}
                serviceName={order.service_types?.name ?? "Order"}
                status={order.status}
                milestone={nextMilestoneText(order)}
                showProgress
                className="shrink-0 basis-[88%] snap-center"
              />
            ))}
          </div>
          {orders.length > 1 && (
            <div className="mt-2 flex justify-center gap-1.5">
              {orders.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    i === activeIndex ? "bg-primary" : "bg-line",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-card border border-line bg-card p-5">
          <p className="text-base text-ink">
            Nothing in the wash.{" "}
            {nextSlot ? (
              <>
                Your next free slot is {formatDayLabel(new Date(nextSlot.date))},{" "}
                {formatSlotWindow(nextSlot.start_time, nextSlot.end_time)}.
              </>
            ) : (
              "Check back soon for an open slot."
            )}
          </p>
        </div>
      )}

      <Link
        to="/schedule"
        className="flex h-[52px] w-full items-center justify-center rounded-control bg-primary text-base font-semibold text-primary-foreground"
      >
        Schedule a pickup
      </Link>

      <Link
        to="/plan"
        className="flex items-center justify-between rounded-card border border-line bg-card p-4"
      >
        {planRow && planRow.plans.monthly_quota_kg != null ? (
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">
              {planRow.plans.name} ·{" "}
              {(planRow.plans.monthly_quota_kg - planRow.quota_used_kg).toFixed(1)} of{" "}
              {planRow.plans.monthly_quota_kg} kg left this month
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      (1 - planRow.quota_used_kg / planRow.plans.monthly_quota_kg) * 100,
                    ),
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium text-ink">You&apos;re on pay as you go. See plans.</p>
        )}
      </Link>

      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Next few days</h2>
            <Link to="/orders" className="text-sm text-primary">
              See all
            </Link>
          </div>
          <div className="mt-1 divide-y divide-line">
            {upcoming.map((row) => {
              const Icon = row.kind === "pickup" ? Package : Truck;
              return (
                <div key={row.key} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Icon size={16} />
                  </div>
                  <p className="flex-1 text-sm text-ink">
                    {formatDayLabel(row.date)} ·{" "}
                    {row.kind === "pickup" ? "Pickup" : "Delivery"} · {row.orderCode}
                  </p>
                  <p className={cn("text-sm", row.scheduled ? "text-ink" : "text-muted")}>
                    {row.scheduled ? row.timeLabel : `est. ${row.timeLabel}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate("/help")}
        className="min-h-11 text-center text-sm text-muted underline"
      >
        Report a problem
      </button>
    </div>
  );
}
