import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Package, Truck, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";
import {
  formatClock,
  formatDayLabel,
  formatSlotWindow,
  STATUS_META,
  STAGE_OF_STATUS,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type OrderRow = Tables<"orders"> & {
  service_types: { name: string } | null;
  slots: { date: string; start_time: string; end_time: string; block: string } | null;
};

type PlanRow = Tables<"user_plans"> & { plans: Tables<"plans"> };

const NOTICE_DISMISS_KEY = "dhobisb.dismissedNoticeId";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function nextMilestoneText(order: OrderRow) {
  const deliveryAt = order.estimated_delivery_at ? new Date(order.estimated_delivery_at) : null;

  switch (order.status) {
    case "scheduled":
      if (order.slots) {
        return `Pickup ${formatDayLabel(new Date(order.slots.date))}, ${formatSlotWindow(order.slots.start_time, order.slots.end_time)}`;
      }
      return order.pickup_at ? `Pickup ${formatDayLabel(new Date(order.pickup_at))}` : "Pickup scheduled";
    case "awaiting_pickup":
      return "Your partner is on the way to collect it";
    case "picked_up":
      return "Collected — heading to the wash";
    case "washing":
      return deliveryAt
        ? `Ready by ${formatDayLabel(deliveryAt)}, around ${formatClock(deliveryAt)}`
        : "Being washed";
    case "ready":
      return "Ready — on its way back to you soon";
    case "out_for_delivery":
      return deliveryAt
        ? `Arriving ${formatDayLabel(deliveryAt)}, around ${formatClock(deliveryAt)}`
        : "Out for delivery";
    case "issue_raised":
      return "We're looking into an issue with this order";
    default:
      return "";
  }
}

function OrderCard({ order }: { order: OrderRow }) {
  const meta = STATUS_META[order.status];
  const stage = STAGE_OF_STATUS[order.status];

  return (
    <Link
      to="/orders"
      className="block shrink-0 basis-[88%] snap-center overflow-hidden rounded-card border border-line bg-card"
    >
      <div className="flex">
        <div className="flex w-[36%] shrink-0 items-center justify-center border-r border-dashed border-line bg-accent/15 px-2 py-6">
          <p className="font-display text-lg font-bold tabular-nums leading-tight text-ink whitespace-nowrap">
            {order.order_code}
          </p>
        </div>
        <div className="flex-1 px-4 py-4">
          <p className="text-base font-semibold text-ink">
            {order.service_types?.name ?? "Order"}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
            <span className="text-sm text-muted">{meta.label}</span>
          </div>
          <p className="mt-2 text-sm text-ink">{nextMilestoneText(order)}</p>
        </div>
      </div>
      <div className="flex gap-1 px-4 pb-4">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className={cn("h-1 flex-1 rounded-full", seg <= stage ? "bg-primary" : "bg-line")}
          />
        ))}
      </div>
    </Link>
  );
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

  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [planRow, setPlanRow] = useState<PlanRow | null>(null);
  const [nextSlot, setNextSlot] = useState<Tables<"slots"> | null>(null);
  const [notice, setNotice] = useState<Tables<"notices"> | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;

    async function load() {
      const today = new Date().toISOString().slice(0, 10);

      const [ordersRes, unreadRes, planRes, slotRes, noticeRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*, service_types(name), slots(date, start_time, end_time, block)")
          .eq("user_id", user!.id)
          .not("status", "in", "(delivered,cancelled)"),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("is_read", false),
        supabase
          .from("user_plans")
          .select("*, plans(*)")
          .eq("user_id", user!.id)
          .eq("is_active", true)
          .maybeSingle(),
        profile!.block
          ? supabase
              .from("slots")
              .select("*")
              .eq("block", profile!.block)
              .eq("is_open", true)
              .gte("date", today)
              .order("date")
              .order("start_time")
              .limit(30)
          : Promise.resolve({ data: [] as Tables<"slots">[] }),
        profile!.block
          ? supabase
              .from("notices")
              .select("*")
              .eq("is_active", true)
              .or(`block.is.null,block.eq.${profile!.block}`)
              .order("created_at", { ascending: false })
              .limit(1)
          : Promise.resolve({ data: [] as Tables<"notices">[] }),
      ]);

      if (cancelled) return;

      setOrders((ordersRes.data as OrderRow[] | null) ?? []);
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

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, profile]);

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
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
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
        <button type="button" aria-label="Notifications" className="relative">
          <Bell size={22} className="text-ink" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
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
              <OrderCard key={order.id} order={order} />
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
        to="/orders"
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

      <button type="button" className="text-center text-sm text-muted underline">
        Report a problem
      </button>
    </div>
  );
}
