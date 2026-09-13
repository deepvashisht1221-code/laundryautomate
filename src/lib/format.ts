import { isToday, isTomorrow, format } from "date-fns";
import type { Enums } from "@/types/database";

export function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export const ISSUE_TYPE_LABEL: Record<Enums<"issue_type_type">, string> = {
  missing_item: "Missing item",
  damaged: "Damaged",
  wrong_items: "Wrong items returned",
  late: "Late delivery",
  other: "Something else",
};

export function formatDayLabel(date: Date) {
  if (isToday(date)) return "today";
  if (isTomorrow(date)) return "tomorrow";
  return format(date, "EEEE");
}

export function formatClock(date: Date) {
  const label = format(date, date.getMinutes() === 0 ? "h a" : "h:mm a");
  return label.toLowerCase();
}

export function formatTimeStr(t: string) {
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  const label = mStr === "00" ? `${h}` : `${h}:${mStr}`;
  return { label, period };
}

export function formatSlotWindow(start: string, end: string) {
  const s = formatTimeStr(start);
  const e = formatTimeStr(end);
  if (s.period === e.period) return `${s.label}–${e.label} ${e.period}`;
  return `${s.label} ${s.period}–${e.label} ${e.period}`;
}

export function formatSlotTime(start: string) {
  const s = formatTimeStr(start);
  return `${s.label} ${s.period}`;
}

type OrderStatus = Enums<"order_status_type">;
type PaymentStatus = Enums<"payment_status_type">;

export const STATUS_META: Record<OrderStatus, { label: string; dot: string }> = {
  scheduled: { label: "Slot booked", dot: "bg-muted" },
  awaiting_pickup: { label: "Awaiting pickup", dot: "bg-primary" },
  picked_up: { label: "Pickup done", dot: "bg-primary" },
  washing: { label: "In progress", dot: "bg-primary" },
  ready: { label: "Ready", dot: "bg-success" },
  out_for_delivery: { label: "Out for delivery", dot: "bg-success" },
  delivered: { label: "Drop done", dot: "bg-success" },
  cancelled: { label: "Cancelled", dot: "bg-muted" },
  issue_raised: { label: "Issue reported", dot: "bg-danger" },
};

export function isBookingComplete(order: { status: OrderStatus; payment_status: PaymentStatus }) {
  return (
    order.status === "delivered" &&
    (order.payment_status === "paid" || order.payment_status === "covered_by_plan")
  );
}

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; dot: string }> = {
  unpaid: { label: "Payment pending", dot: "bg-muted" },
  submitted: { label: "Awaiting verification", dot: "bg-primary" },
  rejected: { label: "Payment not verified", dot: "bg-danger" },
  paid: { label: "Paid", dot: "bg-success" },
  covered_by_plan: { label: "Covered by plan", dot: "bg-success" },
};

export const STAGE_OF_STATUS: Record<OrderStatus, number> = {
  scheduled: 1,
  awaiting_pickup: 1,
  picked_up: 2,
  washing: 3,
  ready: 4,
  out_for_delivery: 4,
  delivered: 4,
  cancelled: 0,
  issue_raised: 3,
};

export function relevantAt(order: {
  status: OrderStatus;
  pickup_at: string | null;
  estimated_delivery_at: string | null;
  created_at: string;
}): Date {
  const prePickup = order.status === "scheduled" || order.status === "awaiting_pickup";
  const ts = prePickup ? order.pickup_at : (order.estimated_delivery_at ?? order.pickup_at);
  return new Date(ts ?? order.created_at);
}

export const MAIN_STEPS: OrderStatus[] = ["scheduled", "picked_up", "washing", "delivered"];

type MilestoneOrder = {
  status: OrderStatus;
  payment_status?: PaymentStatus;
  estimated_delivery_at: string | null;
  pickup_at: string | null;
  slots: { date: string; start_time: string; end_time: string } | null;
};

export function nextMilestoneText(order: MilestoneOrder) {
  const deliveryAt = order.estimated_delivery_at ? new Date(order.estimated_delivery_at) : null;

  switch (order.status) {
    case "scheduled":
      if (order.slots) {
        return `Pickup ${formatDayLabel(new Date(order.slots.date))}, ${formatSlotTime(order.slots.start_time)}`;
      }
      return order.pickup_at
        ? `Pickup ${formatDayLabel(new Date(order.pickup_at))}`
        : "Pickup scheduled";
    case "awaiting_pickup":
      return "Your partner is on the way to collect it";
    case "picked_up":
      return "Collected — heading to the wash";
    case "washing":
      return deliveryAt
        ? `Ready by ${formatDayLabel(deliveryAt)}, around ${formatClock(deliveryAt)}`
        : "In progress";
    case "ready":
      return "Ready — on its way back to you soon";
    case "out_for_delivery":
      return deliveryAt
        ? `Arriving ${formatDayLabel(deliveryAt)}, around ${formatClock(deliveryAt)}`
        : "Out for delivery";
    case "delivered":
      switch (order.payment_status) {
        case "unpaid":
          return "Upload your payment screenshot to finish up";
        case "submitted":
          return "Payment submitted — awaiting verification";
        case "rejected":
          return "Payment not verified — please upload again";
        default:
          return "Booking complete";
      }
    case "issue_raised":
      return "We're looking into an issue with this order";
    default:
      return "";
  }
}

export type TimelineStep = {
  key: string;
  label: string;
  timestamp: string | null;
  note: string | null;
  state: "completed" | "current" | "future";
};

type OrderEventLike = { status: OrderStatus; note: string | null; created_at: string };

function lastCompletedMainIndex(events: OrderEventLike[]) {
  const eventStatuses = new Set(events.map((e) => e.status));
  return MAIN_STEPS.reduce((acc, s, i) => (eventStatuses.has(s) ? i : acc), -1);
}

export function mainStatusIndex(status: OrderStatus, events: OrderEventLike[]): number {
  if (status === "cancelled" || status === "issue_raised") {
    return lastCompletedMainIndex(events);
  }
  return MAIN_STEPS.indexOf(status);
}

export type OrderForTimeline = {
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_submitted_at: string | null;
  payment_verified_at: string | null;
};

function paymentSteps(order: OrderForTimeline): TimelineStep[] {
  if (order.payment_status === "covered_by_plan") return [];

  let doneState: TimelineStep["state"];
  let verifiedState: TimelineStep["state"];
  let doneNote: string | null = null;

  switch (order.payment_status) {
    case "submitted":
      doneState = "completed";
      verifiedState = "current";
      break;
    case "rejected":
      doneState = "current";
      verifiedState = "future";
      doneNote = "Not verified — please upload your payment screenshot again.";
      break;
    case "paid":
      doneState = "completed";
      verifiedState = "completed";
      break;
    default:
      doneState = "current";
      verifiedState = "future";
  }

  return [
    {
      key: "payment_submitted",
      label: "Payment done",
      timestamp: order.payment_submitted_at,
      note: doneNote,
      state: doneState,
    },
    {
      key: "payment_verified",
      label: "Payment verified",
      timestamp: order.payment_verified_at,
      note: null,
      state: verifiedState,
    },
  ];
}

export function buildTimeline(order: OrderForTimeline, events: OrderEventLike[]): TimelineStep[] {
  const status = order.status;
  const eventByStatus = new Map<OrderStatus, OrderEventLike>();
  for (const e of events) eventByStatus.set(e.status, e);
  const lastCompletedIndex = lastCompletedMainIndex(events);

  if (status === "cancelled") {
    const steps: TimelineStep[] = MAIN_STEPS.slice(0, lastCompletedIndex + 1).map((s) => ({
      key: s,
      label: STATUS_META[s].label,
      timestamp: eventByStatus.get(s)?.created_at ?? null,
      note: eventByStatus.get(s)?.note ?? null,
      state: "completed",
    }));
    const cancelEvent = eventByStatus.get("cancelled");
    steps.push({
      key: "cancelled",
      label: "Cancelled",
      timestamp: cancelEvent?.created_at ?? null,
      note: cancelEvent?.note ?? null,
      state: "current",
    });
    return steps;
  }

  if (status === "issue_raised") {
    const issueEvent = eventByStatus.get("issue_raised");
    const steps: TimelineStep[] = [];
    MAIN_STEPS.forEach((s, i) => {
      steps.push({
        key: s,
        label: STATUS_META[s].label,
        timestamp: eventByStatus.get(s)?.created_at ?? null,
        note: eventByStatus.get(s)?.note ?? null,
        state: i <= lastCompletedIndex ? "completed" : "future",
      });
      if (i === lastCompletedIndex) {
        steps.push({
          key: "issue_raised",
          label: "Issue reported",
          timestamp: issueEvent?.created_at ?? null,
          note: issueEvent?.note ?? null,
          state: "current",
        });
      }
    });
    return steps;
  }

  const currentIndex = MAIN_STEPS.indexOf(status);
  const steps: TimelineStep[] = MAIN_STEPS.map((s, i) => ({
    key: s,
    label: STATUS_META[s].label,
    timestamp: eventByStatus.get(s)?.created_at ?? null,
    note: eventByStatus.get(s)?.note ?? null,
    state:
      i < currentIndex || (i === currentIndex && status === "delivered")
        ? "completed"
        : i === currentIndex
          ? "current"
          : "future",
  }));

  if (status === "delivered") {
    steps.push(...paymentSteps(order));
  }

  return steps;
}
