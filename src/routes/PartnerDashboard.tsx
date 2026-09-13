import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, Check, ChevronDown, LogOut, Plus, Users, X } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";
import { VILLAGE_BLOCKS } from "@/lib/locations";
import { formatDayLabel, formatSlotTime, PAYMENT_STATUS_META } from "@/lib/format";
import { uploadOrderPhoto } from "@/lib/uploadPhoto";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/Skeleton";
import { InlineError } from "@/components/InlineError";
import { EmptyState } from "@/components/EmptyState";

type SlotRow = Tables<"slots">;

type RosterOrder = Pick<
  Tables<"orders">,
  | "id"
  | "order_code"
  | "bag_count"
  | "status"
  | "payment_status"
  | "pickup_photo_url"
  | "dropoff_photo_url"
  | "payment_photo_url"
> & {
  profiles: Pick<Tables<"profiles">, "full_name" | "block" | "room_number" | "phone"> | null;
};

const UNLIMITED_CAPACITY = 999999;

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

const ROSTER_ORDER_COLUMNS =
  "id, order_code, bag_count, status, payment_status, pickup_photo_url, dropoff_photo_url, payment_photo_url, profiles!orders_user_id_fkey(full_name, block, room_number, phone)";

function RosterOrderCard({ order, onChanged }: { order: RosterOrder; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingKindRef = useRef<"pickup" | "dropoff" | null>(null);

  function pickPhotoFor(kind: "pickup" | "dropoff") {
    pendingKindRef.current = kind;
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const kind = pendingKindRef.current;
    e.target.value = "";
    if (!file || !kind) return;

    setBusy(true);
    setRowError(null);
    try {
      const url = await uploadOrderPhoto(order.id, kind, file);
      if (kind === "pickup") {
        const { error } = await supabase
          .from("orders")
          .update({ status: "picked_up", pickup_photo_url: url })
          .eq("id", order.id);
        if (error) throw error;
        await supabase.from("order_events").insert({
          order_id: order.id,
          status: "picked_up",
          actor: "partner",
        });
      } else {
        const { error } = await supabase
          .from("orders")
          .update({
            status: "delivered",
            dropoff_photo_url: url,
            delivered_at: new Date().toISOString(),
          })
          .eq("id", order.id);
        if (error) throw error;
        await supabase.from("order_events").insert({
          order_id: order.id,
          status: "delivered",
          actor: "partner",
        });
      }
      onChanged();
    } catch {
      setRowError("Couldn't upload that photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function startWashing() {
    setBusy(true);
    setRowError(null);
    const { error } = await supabase
      .from("orders")
      .update({ status: "washing" })
      .eq("id", order.id);
    setBusy(false);
    if (error) {
      setRowError("Couldn't update this order. Please try again.");
      return;
    }
    await supabase.from("order_events").insert({
      order_id: order.id,
      status: "washing",
      actor: "partner",
    });
    onChanged();
  }

  async function reviewPayment(approve: boolean) {
    setBusy(true);
    setRowError(null);
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: approve ? "paid" : "rejected",
        payment_verified_at: approve ? new Date().toISOString() : null,
      })
      .eq("id", order.id);
    setBusy(false);
    if (error) {
      setRowError("Couldn't update payment status. Please try again.");
      return;
    }
    onChanged();
  }

  return (
    <div className="flex flex-col gap-2.5 py-2.5 text-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          void handleFileSelected(e);
        }}
        className="hidden"
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-ink">{order.profiles?.full_name ?? "Student"}</p>
          <p className="text-xs text-muted">
            {[order.profiles?.block, order.profiles?.room_number ? `Room ${order.profiles.room_number}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="text-right text-xs text-muted">
          <p>{order.order_code}</p>
          <p>
            {order.bag_count} bag{order.bag_count === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {(order.status === "scheduled" || order.status === "awaiting_pickup") && (
        <button
          type="button"
          onClick={() => pickPhotoFor("pickup")}
          disabled={busy}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Camera size={14} />
          {busy ? "Uploading…" : "Mark picked up"}
        </button>
      )}

      {order.status === "picked_up" && (
        <button
          type="button"
          onClick={() => {
            void startWashing();
          }}
          disabled={busy}
          className="flex h-10 w-full items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Updating…" : "Start washing"}
        </button>
      )}

      {order.status === "washing" && (
        <button
          type="button"
          onClick={() => pickPhotoFor("dropoff")}
          disabled={busy}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Camera size={14} />
          {busy ? "Uploading…" : "Mark delivered"}
        </button>
      )}

      {order.status === "delivered" && order.payment_status !== "covered_by_plan" && (
        <div className="rounded-control bg-surface-variant p-2.5">
          {order.payment_status === "submitted" && order.payment_photo_url ? (
            <div className="flex flex-col gap-2">
              <img
                src={order.payment_photo_url}
                alt="Payment screenshot"
                className="max-h-40 w-full rounded-control object-contain"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void reviewPayment(true);
                  }}
                  disabled={busy}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-success text-xs font-semibold text-white disabled:opacity-60"
                >
                  <Check size={13} />
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void reviewPayment(false);
                  }}
                  disabled={busy}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-danger text-xs font-semibold text-white disabled:opacity-60"
                >
                  <X size={13} />
                  Deny
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", PAYMENT_STATUS_META[order.payment_status].dot)} />
              <p className="text-xs text-muted">
                {order.payment_status === "paid"
                  ? "Payment verified — booking complete"
                  : order.payment_status === "rejected"
                    ? "Waiting for student to re-upload payment"
                    : "Waiting for student to submit payment"}
              </p>
            </div>
          )}
        </div>
      )}

      {rowError && <p className="text-xs text-danger">{rowError}</p>}
    </div>
  );
}

function RosterPanel({ slotId }: { slotId: string }) {
  const [orders, setOrders] = useState<RosterOrder[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const { data, error: fetchError } = await supabase
      .from("orders")
      .select(ROSTER_ORDER_COLUMNS)
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
        <RosterOrderCard key={o.id} order={o} onChanged={load} />
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

  const [villages, setVillages] = useState<string[]>([]);
  const [date, setDate] = useState(todayStr());
  const [pickupTime, setPickupTime] = useState("09:00");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function toggleVillage(v: string) {
    setVillages((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

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
    if (!user || villages.length === 0) return;
    setCreating(true);
    setCreateError(null);

    const { error: insertError } = await supabase.from("slots").insert(
      villages.map((village) => ({
        partner_id: user.id,
        village,
        date,
        start_time: `${pickupTime}:00`,
        end_time: `${pickupTime}:00`,
        capacity: UNLIMITED_CAPACITY,
      })),
    );

    setCreating(false);
    if (insertError) {
      setCreateError("Couldn't add this slot. Please try again.");
      return;
    }
    setVillages([]);
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
          className="flex flex-col gap-4 rounded-card bg-card shadow-elevation-1 p-4"
        >
          <h2 className="text-sm font-semibold text-ink">Add a pickup timing</h2>

          <div>
            <span className="text-sm text-ink">Student Villages</span>
            <div className="mt-2 flex flex-col gap-2">
              {Object.keys(VILLAGE_BLOCKS).map((v) => {
                const checked = villages.includes(v);
                return (
                  <label
                    key={v}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-card border px-3 py-2",
                      checked ? "border-primary bg-primary-soft" : "border-line bg-card",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleVillage(v)}
                      style={{ accentColor: "var(--primary)" }}
                      className="h-5 w-5"
                    />
                    <span className="text-sm text-ink">{v}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-sm text-ink">Date</span>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 w-full rounded-t-control border-0 border-b-2 border-line bg-surface-variant px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm text-ink">Pickup time</span>
            <input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              required
              className="mt-1 w-full rounded-t-control border-0 border-b-2 border-line bg-surface-variant px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
            />
          </label>

          {createError && <p className="text-sm text-danger">{createError}</p>}

          <button
            type="submit"
            disabled={creating || villages.length === 0}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-elevation-1 disabled:opacity-60"
          >
            <Plus size={16} />
            {creating
              ? "Adding…"
              : villages.length > 1
                ? `Add timing to ${villages.length} villages`
                : "Add timing"}
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
              return (
                <div
                  key={slot.id}
                  className="overflow-hidden rounded-card bg-card shadow-elevation-1"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedSlotId(expanded ? null : slot.id)}
                    aria-expanded={expanded}
                    className="flex min-h-11 w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {formatDayLabel(new Date(slot.date))}, {formatSlotTime(slot.start_time)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{slot.village}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <Users size={14} />
                        <span>
                          {slot.booked_count} booked
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
