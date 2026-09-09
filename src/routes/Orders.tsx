import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Star, PackageSearch } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";
import { nextMilestoneText, relevantAt } from "@/lib/format";
import { OrderStubCard } from "@/components/OrderStubCard";
import { Skeleton } from "@/components/Skeleton";
import { InlineError } from "@/components/InlineError";
import { EmptyState } from "@/components/EmptyState";
import { saveCache, loadCache } from "@/lib/offlineCache";
import { useRegisterRefresh } from "@/lib/refresh-context";
import { cn } from "@/lib/utils";

const ACTIVE_CACHE_KEY = "orders.active";

type ActiveOrderRow = Tables<"orders"> & {
  service_types: { name: string } | null;
  slots: { date: string; start_time: string; end_time: string } | null;
};

type HistoryOrderRow = Tables<"orders"> & {
  service_types: { name: string } | null;
};

const SERVICE_FILTERS = ["All", "Wash & fold", "Wash & iron", "Dry clean"] as const;

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= rating ? "fill-accent text-accent" : "text-line"}
        />
      ))}
    </div>
  );
}

function downloadCsv(rows: HistoryOrderRow[]) {
  const header = ["Order code", "Date", "Service", "Weight (kg)", "Amount", "Status", "Rating"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) => {
    const date = r.delivered_at ?? r.created_at;
    return [
      r.order_code,
      format(new Date(date), "yyyy-MM-dd"),
      r.service_types?.name ?? "",
      r.weight_kg != null ? String(r.weight_kg) : "",
      r.amount != null ? String(r.amount) : "",
      r.status,
      r.rating != null ? String(r.rating) : "",
    ]
      .map(String)
      .map(escape)
      .join(",");
  });
  const csv = [header.map(escape).join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dhobisb-statement.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function Orders() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"active" | "history">("active");

  const [activeOrders, setActiveOrders] = useState<ActiveOrderRow[] | null>(null);
  const [activeError, setActiveError] = useState(false);
  const [showingCached, setShowingCached] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<HistoryOrderRow[] | null>(null);
  const [historyError, setHistoryError] = useState(false);

  const [serviceFilter, setServiceFilter] = useState<(typeof SERVICE_FILTERS)[number]>("All");
  const [search, setSearch] = useState("");

  const loadActive = useCallback(async () => {
    if (!user) return;
    setActiveError(false);
    const { data, error } = await supabase
      .from("orders")
      .select("*, service_types(name), slots(date, start_time, end_time)")
      .eq("user_id", user.id)
      .not("status", "in", "(delivered,cancelled)");

    if (error) {
      const cached = loadCache<ActiveOrderRow[]>(ACTIVE_CACHE_KEY);
      if (cached) {
        setActiveOrders(cached.data);
        setShowingCached(true);
      } else {
        setActiveError(true);
      }
      return;
    }
    const rows = ((data as ActiveOrderRow[] | null) ?? []).sort(
      (a, b) => relevantAt(a).getTime() - relevantAt(b).getTime(),
    );
    setActiveOrders(rows);
    setShowingCached(false);
    saveCache(ACTIVE_CACHE_KEY, rows);
  }, [user]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryError(false);
    const { data, error } = await supabase
      .from("orders")
      .select("*, service_types(name)")
      .eq("user_id", user.id)
      .in("status", ["delivered", "cancelled"])
      .order("created_at", { ascending: false });

    if (error) {
      setHistoryError(true);
      return;
    }
    setHistoryOrders((data as HistoryOrderRow[] | null) ?? []);
  }, [user]);

  useEffect(() => {
    loadActive();
  }, [loadActive]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useRegisterRefresh(
    useCallback(async () => {
      await Promise.all([loadActive(), loadHistory()]);
    }, [loadActive, loadHistory]),
  );

  const filteredHistory = useMemo(() => {
    if (!historyOrders) return [];
    return historyOrders.filter((o) => {
      const matchesService =
        serviceFilter === "All" || o.service_types?.name === serviceFilter;
      const matchesSearch =
        !search.trim() || o.order_code.toLowerCase().includes(search.trim().toLowerCase());
      return matchesService && matchesSearch;
    });
  }, [historyOrders, serviceFilter, search]);

  const groupedHistory = useMemo(() => {
    const groups = new Map<string, HistoryOrderRow[]>();
    for (const o of filteredHistory) {
      const key = format(new Date(o.delivered_at ?? o.created_at), "MMMM yyyy");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(o);
    }
    return Array.from(groups.entries());
  }, [filteredHistory]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-xl font-bold text-ink">Orders</h1>

      <div className="flex rounded-control bg-primary-soft p-1">
        {(["active", "history"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "min-h-11 flex-1 rounded-control text-sm font-semibold capitalize transition-colors",
              tab === t ? "bg-card text-ink shadow-sm" : "text-muted",
            )}
          >
            {t === "active" ? "Active" : "History"}
          </button>
        ))}
      </div>

      {tab === "active" && (
        <>
          {showingCached && (
            <p className="text-center text-xs text-muted">Showing your last saved status.</p>
          )}
          {activeOrders === null && !activeError ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : activeError ? (
            <InlineError message="Couldn't load your orders." onRetry={loadActive} />
          ) : activeOrders!.length === 0 ? (
            <EmptyState
              icon={
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <PackageSearch size={22} />
                </span>
              }
              title="Nothing in the wash right now"
              action={
                <Link
                  to="/schedule"
                  className="flex h-11 w-full items-center justify-center rounded-control bg-primary text-sm font-semibold text-primary-foreground"
                >
                  Schedule a pickup
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {activeOrders!.map((order) => (
                <OrderStubCard
                  key={order.id}
                  orderId={order.id}
                  orderCode={order.order_code}
                  serviceName={order.service_types?.name ?? "Order"}
                  status={order.status}
                  milestone={nextMilestoneText(order)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div className="flex flex-col gap-4">
          <div className="no-scrollbar -mx-screen flex gap-2 overflow-x-auto px-screen">
            {SERVICE_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setServiceFilter(f)}
                className={cn(
                  "flex min-h-11 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium",
                  serviceFilter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-line bg-card text-ink",
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex min-h-11 items-center gap-2 rounded-control border border-line bg-card px-3 py-2">
            <Search size={16} className="text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order code"
              aria-label="Search order history by code"
              className="w-full bg-transparent text-sm text-ink focus:outline-none"
            />
          </div>

          {historyOrders === null && !historyError ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : historyError ? (
            <InlineError message="Couldn't load your order history." onRetry={loadHistory} />
          ) : filteredHistory.length === 0 ? (
            historyOrders!.length === 0 ? (
              <EmptyState
                title="Your finished orders will show up here."
                action={
                  <Link
                    to="/schedule"
                    className="flex h-11 w-full items-center justify-center rounded-control bg-primary text-sm font-semibold text-primary-foreground"
                  >
                    Schedule your first pickup
                  </Link>
                }
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted">No orders match your filters.</p>
            )
          ) : (
            <div className="flex flex-col">
              {groupedHistory.map(([month, rows]) => (
                <div key={month}>
                  <div className="sticky top-0 z-10 -mx-screen bg-surface px-screen py-1.5">
                    <p className="text-xs font-semibold uppercase text-muted">{month}</p>
                  </div>
                  <div className="flex flex-col divide-y divide-line">
                    {rows.map((o) => {
                      const cancelled = o.status === "cancelled";
                      const date = new Date(o.delivered_at ?? o.created_at);
                      return (
                        <Link
                          key={o.id}
                          to={`/orders/${o.id}`}
                          className="flex items-center justify-between py-3"
                        >
                          <div className={cn(cancelled && "opacity-50")}>
                            <p className="text-sm font-medium text-ink">
                              {o.order_code} · {o.service_types?.name ?? "Order"}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                              {format(date, "MMM d")}
                              {o.weight_kg != null ? ` · ${o.weight_kg} kg` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={cn(
                                "text-sm font-medium",
                                cancelled ? "text-muted line-through" : "text-ink",
                              )}
                            >
                              {o.amount != null
                                ? `₹${o.amount}`
                                : o.payment_status === "covered_by_plan"
                                  ? "Plan"
                                  : "—"}
                            </p>
                            {!cancelled &&
                              (o.rating ? (
                                <Stars rating={o.rating} />
                              ) : (
                                <span className="text-xs text-primary underline">Rate</span>
                              ))}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredHistory.length > 0 && (
            <button
              type="button"
              onClick={() => downloadCsv(filteredHistory)}
              className="min-h-11 pb-2 text-center text-sm text-muted underline"
            >
              Download statement
            </button>
          )}
        </div>
      )}
    </div>
  );
}
