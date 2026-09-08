import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Check, Phone, MessageCircle, Star } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Tables, Enums } from "@/types/database";
import {
  STATUS_META,
  MAIN_STEPS,
  buildTimeline,
  mainStatusIndex,
  type TimelineStep,
} from "@/lib/format";
import { ITEM_CATEGORIES } from "@/lib/estimate";
import { cn } from "@/lib/utils";

type OrderDetailRow = Tables<"orders"> & {
  service_types: Tables<"service_types"> | null;
  slots: Tables<"slots"> | null;
  partner: Pick<Tables<"profiles">, "id" | "full_name" | "avatar_url" | "phone"> | null;
};

const PILL_CLASS: Record<string, string> = {
  "bg-muted": "bg-muted text-white",
  "bg-primary": "bg-primary text-white",
  "bg-success": "bg-success text-white",
  "bg-danger": "bg-danger text-white",
};

const PAYMENT_LABEL: Record<Enums<"payment_status_type">, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  covered_by_plan: "Covered by plan",
};

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="max-w-[65%] text-right text-ink">{value}</span>
    </div>
  );
}

function StepMarker({ state }: { state: TimelineStep["state"] }) {
  if (state === "completed") {
    return (
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Check size={14} />
      </div>
    );
  }
  if (state === "current") {
    return (
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/40" />
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent bg-card" />
      </div>
    );
  }
  return (
    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-line bg-card" />
  );
}

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetailRow | null>(null);
  const [events, setEvents] = useState<Tables<"order_events">[]>([]);
  const [loading, setLoading] = useState(true);
  const [lineFilled, setLineFilled] = useState(false);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;

    async function load() {
      const [orderRes, eventsRes] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "*, service_types(*), slots(date, start_time, end_time, block), partner:profiles!orders_partner_id_fkey(id, full_name, avatar_url, phone)",
          )
          .eq("id", id!)
          .eq("user_id", user!.id)
          .maybeSingle(),
        supabase
          .from("order_events")
          .select("*")
          .eq("order_id", id!)
          .order("created_at", { ascending: true }),
      ]);

      if (cancelled) return;
      setOrder((orderRes.data as OrderDetailRow | null) ?? null);
      setEvents(eventsRes.data ?? []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setLineFilled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  async function handleCancelOrder() {
    if (!order) return;
    setCancelling(true);
    setCancelError(null);

    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id);

    if (error) {
      setCancelling(false);
      setCancelError("Couldn't cancel your pickup. Please try again.");
      return;
    }

    await supabase.from("order_events").insert({
      order_id: order.id,
      status: "cancelled",
      note: "Cancelled by student",
      actor: "student",
    });

    setCancelling(false);
    setCancelDialogOpen(false);
    navigate("/orders");
  }

  async function handleSubmitRating() {
    if (!order || ratingValue === 0) return;
    setSubmittingRating(true);
    const { error } = await supabase
      .from("orders")
      .update({ rating: ratingValue, review: ratingComment.trim() || null })
      .eq("id", order.id);
    setSubmittingRating(false);
    if (!error) {
      setOrder({ ...order, rating: ratingValue, review: ratingComment.trim() || null });
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-screen text-center">
        <p className="text-base text-ink">We couldn&apos;t find that order.</p>
        <button
          type="button"
          onClick={() => navigate("/orders")}
          className="text-sm text-primary underline"
        >
          Back to orders
        </button>
      </div>
    );
  }

  const meta = STATUS_META[order.status];
  const timeline = buildTimeline(order.status, events);
  const currentIndex = timeline.findIndex((s) => s.state === "current");
  const fillPercent =
    timeline.length <= 1
      ? 0
      : ((currentIndex === -1 ? timeline.length - 1 : currentIndex) / (timeline.length - 1)) *
        100;

  const idx = mainStatusIndex(order.status, events);
  const awaitingIdx = MAIN_STEPS.indexOf("awaiting_pickup");
  const outForDeliveryIdx = MAIN_STEPS.indexOf("out_for_delivery");
  const pickupExpanded = order.status !== "cancelled" && idx <= awaitingIdx;
  const pickupDone = order.status !== "cancelled" && idx > awaitingIdx;
  const deliveryExpanded = order.status !== "cancelled" && idx === outForDeliveryIdx;
  const deliveryDone = order.status !== "cancelled" && idx > outForDeliveryIdx;

  const declared = (order.declared_items ?? {}) as Record<string, number>;
  const verified = order.verified_items as Record<string, number> | null;
  const hasDeclared = Object.values(declared).some((n) => (n ?? 0) > 0);
  const hasVerified = verified != null;
  const hasMismatch =
    hasVerified &&
    ITEM_CATEGORIES.some((c) => (declared[c.key] ?? 0) !== (verified![c.key] ?? 0));

  return (
    <div className="relative flex flex-1 flex-col">
      {cancelDialogOpen && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-ink/40 px-screen"
          onClick={() => setCancelDialogOpen(false)}
        >
          <div
            className="w-full rounded-card bg-card p-5 shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-ink">Cancel this pickup?</h2>
            <p className="mt-2 text-sm text-muted">
              Free until 2 hours before your slot. After that, please contact support to cancel.
            </p>
            {cancelError && <p className="mt-2 text-sm text-danger">{cancelError}</p>}
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleCancelOrder();
                }}
                disabled={cancelling}
                className="h-11 w-full rounded-control bg-danger text-sm font-semibold text-white disabled:opacity-70"
              >
                {cancelling ? "Cancelling…" : "Cancel pickup"}
              </button>
              <button
                type="button"
                onClick={() => setCancelDialogOpen(false)}
                className="h-11 w-full rounded-control border border-line text-sm font-semibold text-ink"
              >
                Keep pickup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 px-screen pt-4">
        <button
          type="button"
          onClick={() => navigate("/orders")}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-primary-soft"
        >
          <ChevronLeft size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-screen py-4">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold tabular-nums text-ink">
            {order.order_code}
          </h1>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              PILL_CLASS[meta.dot] ?? "bg-muted text-white",
            )}
          >
            {meta.label}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted">{order.service_types?.name ?? "Order"}</p>

        <div className="relative mt-6">
          <div className="absolute left-4 top-2 bottom-2 w-0.5 -translate-x-1/2 bg-line" />
          <div
            className="absolute left-4 top-2 w-0.5 -translate-x-1/2 bg-primary ease-out"
            style={{
              height: lineFilled ? `${fillPercent}%` : "0%",
              transitionProperty: "height",
              transitionDuration: "600ms",
            }}
          />
          <div className="flex flex-col gap-6">
            {timeline.map((step) => (
              <div key={step.key} className="flex gap-4">
                <StepMarker state={step.state} />
                <div className="flex-1 pb-0.5">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      step.state === "future" ? "text-muted" : "text-ink",
                    )}
                  >
                    {step.label}
                  </p>
                  {step.timestamp && (
                    <p className="text-xs text-muted">
                      {format(new Date(step.timestamp), "MMM d, h:mm a")}
                    </p>
                  )}
                  {step.note && <p className="mt-0.5 text-sm text-ink">{step.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {order.status !== "cancelled" && (pickupExpanded || pickupDone || deliveryExpanded) && (
          <div className="mt-6 flex flex-col gap-3">
            {pickupExpanded ? (
              <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-card p-5">
                <QRCodeSVG value={order.id} size={160} />
                <p className="text-center text-sm text-muted">
                  Show this when you hand over your bag.
                </p>
                <p className="font-display text-sm font-semibold tabular-nums text-ink">
                  {order.order_code}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-card border border-line bg-card p-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Check size={14} />
                </span>
                <p className="text-sm text-ink">Pickup handoff complete</p>
              </div>
            )}

            {deliveryExpanded && (
              <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-card p-5">
                <QRCodeSVG value={order.id} size={160} />
                <p className="text-center text-sm text-muted">
                  Show this when your order is delivered.
                </p>
                <p className="font-display text-sm font-semibold tabular-nums text-ink">
                  {order.order_code}
                </p>
              </div>
            )}
            {deliveryDone && (
              <div className="flex items-center gap-3 rounded-card border border-line bg-card p-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Check size={14} />
                </span>
                <p className="text-sm text-ink">Delivery handoff complete</p>
              </div>
            )}
          </div>
        )}

        {(hasDeclared || hasVerified) && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-ink">Bag contents</h2>
            <div className="mt-2 overflow-hidden rounded-card border border-line bg-card">
              <div className="grid grid-cols-3 gap-2 border-b border-line px-4 py-2 text-xs font-medium text-muted">
                <span>Item</span>
                <span className="text-center">You declared</span>
                <span className="text-center">Partner verified</span>
              </div>
              {ITEM_CATEGORIES.map((cat) => {
                const declaredCount = declared[cat.key] ?? 0;
                const verifiedCount = hasVerified ? (verified![cat.key] ?? 0) : null;
                const mismatch = hasVerified && declaredCount !== verifiedCount;
                return (
                  <div
                    key={cat.key}
                    className={cn(
                      "grid grid-cols-3 gap-2 border-b border-line px-4 py-2.5 last:border-0",
                      mismatch && "border-l-4 border-l-warning bg-warning/15",
                    )}
                  >
                    <span className="text-sm text-ink">{cat.label}</span>
                    <span className="text-center text-sm text-ink">{declaredCount}</span>
                    <span
                      className={cn(
                        "text-center text-sm font-medium",
                        mismatch ? "text-warning" : hasVerified ? "text-ink" : "text-muted",
                      )}
                    >
                      {hasVerified ? verifiedCount : "Pending check"}
                    </span>
                  </div>
                );
              })}
            </div>
            {hasMismatch && (
              <button
                type="button"
                className="mt-3 h-11 w-full rounded-control border border-warning text-sm font-semibold text-warning"
              >
                Something&apos;s missing
              </button>
            )}
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ink">Details</h2>
          <div className="mt-2 flex flex-col gap-2 rounded-card border border-line bg-card p-4">
            <DetailRow
              label="Weight"
              value={order.weight_kg != null ? `${order.weight_kg} kg` : "Not yet weighed"}
            />
            <DetailRow
              label="Price"
              value={
                order.amount != null
                  ? `₹${order.amount}`
                  : order.payment_status === "covered_by_plan"
                    ? "Covered by plan"
                    : "—"
              }
            />
            <DetailRow label="Payment" value={PAYMENT_LABEL[order.payment_status]} />
            {order.slots?.block && <DetailRow label="Pickup block" value={order.slots.block} />}
            {order.special_instructions && (
              <DetailRow label="Instructions" value={order.special_instructions} />
            )}
          </div>
        </div>

        {order.partner && idx >= awaitingIdx && (
          <div className="mt-6 flex items-center gap-3 rounded-card border border-line bg-card p-4">
            {order.partner.avatar_url ? (
              <img
                src={order.partner.avatar_url}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold uppercase text-primary">
                {initials(order.partner.full_name)}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">{order.partner.full_name}</p>
              <p className="text-xs text-muted">Your laundry partner</p>
            </div>
            <div className="flex gap-2">
              <a
                href={`tel:${order.partner.phone ?? ""}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary"
                aria-label="Call partner"
              >
                <Phone size={16} />
              </a>
              <a
                href={`https://wa.me/${(order.partner.phone ?? "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary"
                aria-label="WhatsApp partner"
              >
                <MessageCircle size={16} />
              </a>
            </div>
          </div>
        )}

        {(order.status === "scheduled" || order.status === "awaiting_pickup") && (
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              className="h-11 flex-1 rounded-control border border-line text-sm font-semibold text-ink"
            >
              Reschedule
            </button>
            <button
              type="button"
              onClick={() => setCancelDialogOpen(true)}
              className="h-11 flex-1 rounded-control border border-danger text-sm font-semibold text-danger"
            >
              Cancel pickup
            </button>
          </div>
        )}

        {order.status === "delivered" && order.rating == null && (
          <div className="mt-6 rounded-card border border-line bg-card p-4">
            <p className="text-sm font-medium text-ink">Rate this order</p>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRatingValue(n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  <Star
                    size={24}
                    className={n <= ratingValue ? "fill-accent text-accent" : "text-line"}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Anything you'd like to add? (optional)"
              rows={2}
              className="mt-3 w-full rounded-control border border-line bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                void handleSubmitRating();
              }}
              disabled={ratingValue === 0 || submittingRating}
              className="mt-3 h-11 w-full rounded-control bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submittingRating ? "Submitting…" : "Submit rating"}
            </button>
          </div>
        )}

        <button
          type="button"
          className="mt-6 w-full pb-2 text-center text-sm text-muted underline"
        >
          Report a problem
        </button>
      </div>
    </div>
  );
}
