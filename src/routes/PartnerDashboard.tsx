import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Plus, Users } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";
import { VILLAGE_BLOCKS } from "@/lib/locations";
import { formatDayLabel, formatSlotWindow } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/Skeleton";
import { InlineError } from "@/components/InlineError";
import { EmptyState } from "@/components/EmptyState";

type SlotRow = Tables<"slots">;

type RosterOrder = Pick<Tables<"orders">, "id" | "order_code" | "bag_count"> & {
  profiles: Pick<Tables<"profiles">, "full_name" | "block" | "room_number" | "phone"> | null;
};

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function RosterPanel({ slotId }: { slotId: string }) {
  const [orders, setOrders] = useState<RosterOrder[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const { data, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_code, bag_count, profiles!orders_user_id_fkey(full_name, block, room_number, phone)")
      .eq("pickup_slot_id", slotId);
    if (fetchError) {
      setError(true);
      return;
    }
    setOrders((data as unknown as RosterOrder[]) ?? []);
  }, [slotId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="px-4 pb-4">
        <InlineError message="Couldn't load students for this slot." onRetry={load} />
      </div>
    );
  }

  if (orders === null) {
    return (
      <div className="flex flex-col gap-2 px-4 pb-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <p className="px-4 pb-4 text-sm text-muted">No students have booked this slot yet.</p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-line px-4 pb-2">
      {orders.map((o) => (
        <div key={o.id} className="flex items-center justify-between py-2.5 text-sm">
          <div>
            <p className="font-medium text-ink">{o.profiles?.full_name ?? "Student"}</p>
            <p className="text-xs text-muted">
              {[o.profiles?.block, o.profiles?.room_number ? `Room ${o.profiles.room_number}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="text-right text-xs text-muted">
            <p>{o.order_code}</p>
            <p>
              {o.bag_count} bag{o.bag_count === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PartnerDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [slots, setSlots] = useState<SlotRow[] | null>(null);
  const [error, setError] = useState(false);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);

  const [village, setVillage] = useState("");
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [capacity, setCapacity] = useState(20);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(false);
    const { data, error: fetchError } = await supabase
      .from("slots")
      .select("*")
      .eq("partner_id", user.id)
      .gte("date", todayStr())
      .order("date")
      .order("start_time");
    if (fetchError) {
      setError(true);
      return;
    }
    setSlots(data ?? []);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSignOut() {
    await signOut();
    navigate("/partner/login", { replace: true });
  }

  async function handleCreateSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !village) return;
    if (endTime <= startTime) {
      setCreateError("End time must be after start time.");
      return;
    }
    setCreating(true);
    setCreateError(null);

    const { error: insertError } = await supabase.from("slots").insert({
      partner_id: user.id,
      village,
      date,
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      capacity,
    });

    setCreating(false);
    if (insertError) {
      setCreateError("Couldn't add this slot. Please try again.");
      return;
    }
    await load();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-screen pt-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">{profile?.full_name}</h1>
          <p className="text-sm text-muted">Partner portal</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/partner/change-password"
            className="flex min-h-11 items-center px-2 text-sm font-medium text-primary"
          >
            Change password
          </Link>
          <button
            type="button"
            onClick={() => {
              void handleSignOut();
            }}
            aria-label="Sign out"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-primary-soft"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-screen py-5">
        <form
          onSubmit={handleCreateSlot}
          className="flex flex-col gap-4 rounded-card border border-line bg-card p-4"
        >
          <h2 className="text-sm font-semibold text-ink">Add a pickup slot</h2>

          <label className="block">
            <span className="text-sm text-ink">Student Village</span>
            <select
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              required
              className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
            >
              <option value="">Select village</option>
              {Object.keys(VILLAGE_BLOCKS).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-ink">Date</span>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
            />
          </label>

          <div className="flex gap-3">
            <label className="block flex-1">
              <span className="text-sm text-ink">Start time</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
              />
            </label>
            <label className="block flex-1">
              <span className="text-sm text-ink">End time</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-ink">Capacity (bags)</span>
            <input
              type="number"
              min={1}
              max={200}
              value={capacity}
              onChange={(e) => setCapacity(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
            />
          </label>

          {createError && <p className="text-sm text-danger">{createError}</p>}

          <button
            type="submit"
            disabled={creating || !village}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Plus size={16} />
            {creating ? "Adding…" : "Add slot"}
          </button>
        </form>

        <h2 className="mb-2 mt-6 text-sm font-semibold text-ink">Your upcoming slots</h2>

        {error ? (
          <InlineError message="Couldn't load your slots." onRetry={load} />
        ) : slots === null ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : slots.length === 0 ? (
          <EmptyState title="You haven't added any pickup slots yet." />
        ) : (
          <div className="flex flex-col gap-3">
            {slots.map((slot) => {
              const expanded = expandedSlotId === slot.id;
              const full = slot.booked_count >= slot.capacity;
              return (
                <div
                  key={slot.id}
                  className="overflow-hidden rounded-card border border-line bg-card"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedSlotId(expanded ? null : slot.id)}
                    aria-expanded={expanded}
                    className="flex min-h-11 w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {formatDayLabel(new Date(slot.date))},{" "}
                        {formatSlotWindow(slot.start_time, slot.end_time)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{slot.village}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <Users size={14} />
                        <span className={cn(full && "font-semibold text-warning")}>
                          {slot.booked_count}/{slot.capacity}
                        </span>
                      </div>
                      <ChevronDown
                        size={18}
                        className={cn(
                          "shrink-0 text-muted transition-transform",
                          expanded && "rotate-180",
                        )}
                      />
                    </div>
                  </button>
                  {expanded && <RosterPanel slotId={slot.id} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
