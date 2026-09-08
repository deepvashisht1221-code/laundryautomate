import { isToday, isTomorrow, format } from "date-fns";
import type { Enums } from "@/types/database";

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

type OrderStatus = Enums<"order_status_type">;

export const STATUS_META: Record<OrderStatus, { label: string; dot: string }> = {
  scheduled: { label: "Scheduled", dot: "bg-muted" },
  awaiting_pickup: { label: "Awaiting pickup", dot: "bg-primary" },
  picked_up: { label: "Picked up", dot: "bg-primary" },
  washing: { label: "Washing", dot: "bg-primary" },
  ready: { label: "Ready", dot: "bg-success" },
  out_for_delivery: { label: "Out for delivery", dot: "bg-success" },
  delivered: { label: "Delivered", dot: "bg-success" },
  cancelled: { label: "Cancelled", dot: "bg-muted" },
  issue_raised: { label: "Issue reported", dot: "bg-danger" },
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
