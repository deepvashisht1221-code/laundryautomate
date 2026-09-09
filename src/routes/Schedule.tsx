import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check } from "lucide-react";
import { format, addDays, isToday } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Tables, Enums } from "@/types/database";
import { cn } from "@/lib/utils";
import { formatDayLabel, formatSlotWindow } from "@/lib/format";
import { ITEM_CATEGORIES, estimatePrice, type ItemCounts } from "@/lib/estimate";
import { VILLAGE_BLOCKS, FLOORS, PICKUP_POINTS, pickupPointLabel } from "@/lib/locations";
import { Skeleton } from "@/components/Skeleton";
import { InlineError } from "@/components/InlineError";

type PlanRow = Tables<"user_plans"> & { plans: Tables<"plans"> };
type SlotWithPartner = Tables<"slots"> & { partner: { full_name: string | null } | null };

function buildNext7Days(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => addDays(today, i));
}

function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "md" | "sm";
}) {
  const btnSize = size === "md" ? "h-11 w-11 text-lg" : "h-11 w-11 text-base";
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(
          "flex items-center justify-center rounded-full border border-line text-ink disabled:opacity-30",
          btnSize,
        )}
      >
        −
      </button>
      <span
        className={cn(
          "text-center text-ink",
          size === "md" ? "w-6 text-base font-semibold" : "w-5 text-sm",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(
          "flex items-center justify-center rounded-full border border-line text-ink disabled:opacity-30",
          btnSize,
        )}
      >
        +
      </button>
    </div>
  );
}

function AddressSheet({
  profile,
  userId,
  onClose,
  onSaved,
}: {
  profile: Tables<"profiles">;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [village, setVillage] = useState(profile.village ?? "");
  const [block, setBlock] = useState(profile.block ?? "");
  const [floor, setFloor] = useState(profile.floor ?? "");
  const [roomNumber, setRoomNumber] = useState(profile.room_number ?? "");
  const [pickupPoint, setPickupPoint] = useState<Enums<"pickup_point_type"> | "">(
    profile.pickup_point ?? "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        village,
        block,
        floor,
        room_number: roomNumber,
        pickup_point: pickupPoint || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (!error) {
      onSaved();
      onClose();
    }
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-end bg-ink/40"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-card bg-card p-5 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink">Edit pickup address</h2>
        <div className="mt-4 flex flex-col gap-4">
          <label className="block">
            <span className="text-sm font-medium text-ink">Village</span>
            <select
              value={village}
              onChange={(e) => {
                setVillage(e.target.value);
                setBlock("");
              }}
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
            <span className="text-sm font-medium text-ink">Block</span>
            <select
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              disabled={!village}
              className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
            >
              <option value="">Select block</option>
              {(VILLAGE_BLOCKS[village] ?? []).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink">Floor</span>
            <select
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
            >
              <option value="">Select floor</option>
              {FLOORS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink">Room number</span>
            <input
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
            />
          </label>

          <div>
            <span className="text-sm font-medium text-ink">Pickup point</span>
            <div className="mt-2 flex flex-col gap-2">
              {PICKUP_POINTS.map((point) => {
                const selected = pickupPoint === point.value;
                return (
                  <button
                    key={point.value}
                    type="button"
                    onClick={() => setPickupPoint(point.value)}
                    className={cn(
                      "rounded-card border p-3 text-left",
                      selected ? "border-primary bg-primary-soft" : "border-line bg-card",
                    )}
                  >
                    <p className="text-sm font-medium text-ink">{point.title}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={saving}
          className="mt-6 h-[52px] w-full rounded-control bg-primary text-base font-semibold text-primary-foreground disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save address"}
        </button>
      </div>
    </div>
  );
}

export function Schedule() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState<{ orderCode: string; windowLabel: string } | null>(
    null,
  );

  const [services, setServices] = useState<Tables<"service_types">[] | null>(null);
  const [servicesError, setServicesError] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const [bagCount, setBagCount] = useState(1);
  const [itemCounts, setItemCounts] = useState<ItemCounts>({});

  const [weekDates] = useState(buildNext7Days);
  const [selectedDate, setSelectedDate] = useState(weekDates[0]);
  const [allSlots, setAllSlots] = useState<SlotWithPartner[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [planRow, setPlanRow] = useState<PlanRow | null>(null);

  const [specialInstructions, setSpecialInstructions] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const loadServices = useCallback(() => {
    setServicesError(false);
    supabase
      .from("service_types")
      .select("*")
      .eq("is_active", true)
      .order("price")
      .then(({ data, error }) => {
        if (error) {
          setServicesError(true);
          return;
        }
        setServices(data ?? []);
      });
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_plans")
      .select("*, plans(*)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => setPlanRow((data as PlanRow | null) ?? null));
  }, [user]);

  useEffect(() => {
    if (!profile?.village) return;
    const start = format(weekDates[0], "yyyy-MM-dd");
    const end = format(weekDates[weekDates.length - 1], "yyyy-MM-dd");
    supabase
      .from("slots")
      .select("*, partner:profiles!slots_partner_id_fkey(full_name)")
      .eq("village", profile.village)
      .not("partner_id", "is", null)
      .eq("is_open", true)
      .gte("date", start)
      .lte("date", end)
      .order("date")
      .order("start_time")
      .then(({ data }) => setAllSlots((data as SlotWithPartner[] | null) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.village]);

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    setSelectedSlotId(null);
  }, [selectedDateKey]);

  const daySlots = useMemo(
    () => allSlots.filter((s) => s.date === selectedDateKey),
    [allSlots, selectedDateKey],
  );
  const dayFull = daySlots.length === 0 || daySlots.every((s) => s.booked_count >= s.capacity);

  const nextAvailableDay = useMemo(() => {
    if (!dayFull) return null;
    for (const date of weekDates) {
      const key = format(date, "yyyy-MM-dd");
      if (key <= selectedDateKey) continue;
      const hasOpen = allSlots.some((s) => s.date === key && s.booked_count < s.capacity);
      if (hasOpen) return date;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSlots, selectedDateKey, dayFull]);

  const selectedSlot = allSlots.find((s) => s.id === selectedSlotId) ?? null;
  const selectedService = services?.find((s) => s.id === selectedServiceId) ?? null;

  const estimate = selectedService ? estimatePrice(selectedService, itemCounts, bagCount) : null;
  const quotaRemaining =
    planRow && planRow.plans.monthly_quota_kg != null
      ? planRow.plans.monthly_quota_kg - planRow.quota_used_kg
      : null;
  const isCoveredByPlan = Boolean(
    planRow &&
      quotaRemaining != null &&
      estimate &&
      quotaRemaining > 0 &&
      quotaRemaining >= estimate.weightKg,
  );

  function setItemCount(key: (typeof ITEM_CATEGORIES)[number]["key"], value: number) {
    setItemCounts((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
    else navigate("/");
  }

  function goNext() {
    setStep((s) => Math.min(4, s + 1));
  }

  const canProceed =
    step === 1 ? Boolean(selectedServiceId) : step === 3 ? Boolean(selectedSlotId) : true;

  async function handleConfirm() {
    if (!user || !selectedService || !selectedSlotId || !selectedSlot) return;
    setConfirming(true);
    setConfirmError(null);

    const pickupAt = new Date(`${selectedDateKey}T${selectedSlot.start_time}`);
    const estimatedDeliveryAt = new Date(
      pickupAt.getTime() + selectedService.turnaround_hours * 60 * 60 * 1000,
    );
    const hasDeclaredItems = Object.values(itemCounts).some((n) => (n ?? 0) > 0);

    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        partner_id: selectedSlot.partner_id,
        service_type_id: selectedService.id,
        pickup_slot_id: selectedSlotId,
        pickup_at: pickupAt.toISOString(),
        estimated_delivery_at: estimatedDeliveryAt.toISOString(),
        bag_count: bagCount,
        declared_items: hasDeclaredItems ? itemCounts : {},
        amount: isCoveredByPlan ? null : (estimate?.amount ?? null),
        payment_status: isCoveredByPlan ? "covered_by_plan" : "unpaid",
        special_instructions: specialInstructions.trim() || null,
      })
      .select("id, order_code")
      .single();

    setConfirming(false);

    if (error || !data) {
      setConfirmError(
        error?.message.toLowerCase().includes("full")
          ? "That slot just filled up. Please pick another."
          : "Couldn't schedule your pickup. Please try again.",
      );
      return;
    }

    setSubmitted({
      orderCode: data.order_code,
      windowLabel: `${formatDayLabel(selectedDate)}, ${formatSlotWindow(selectedSlot.start_time, selectedSlot.end_time)}`,
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-screen text-center">
        <div>
          <p className="font-display text-2xl font-bold tabular-nums text-ink">
            {submitted.orderCode}
          </p>
          <p className="mt-2 text-lg font-semibold text-ink">You&apos;re all set</p>
          <p className="mt-1 text-base text-muted">Pickup {submitted.windowLabel}</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="h-[52px] w-full rounded-control bg-primary text-base font-semibold text-primary-foreground"
          >
            Track this order
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="h-[52px] w-full rounded-control border border-line text-base font-semibold text-ink"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      {addressSheetOpen && profile && user && (
        <AddressSheet
          profile={profile}
          userId={user.id}
          onClose={() => setAddressSheetOpen(false)}
          onSaved={() => {
            void refreshProfile();
          }}
        />
      )}

      <div className="flex items-center gap-3 px-screen pt-4">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-primary-soft"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="text-sm text-muted">Step {step} of 4</span>
      </div>

      <div className="flex-1 overflow-y-auto px-screen py-6 pb-28">
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-xl font-bold text-ink">Choose a service</h1>
            {servicesError ? (
              <InlineError message="Couldn't load services." onRetry={loadServices} />
            ) : services === null ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : (
              services.map((s) => {
                const selected = s.id === selectedServiceId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedServiceId(s.id)}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-card border p-4 text-left",
                      selected ? "border-primary bg-primary-soft" : "border-line bg-card",
                    )}
                  >
                    <div>
                      <p className="text-base font-semibold text-ink">{s.name}</p>
                      {s.description && (
                        <p className="mt-0.5 text-sm text-muted">{s.description}</p>
                      )}
                      <p className="mt-1.5 text-sm text-ink">
                        ₹{s.price}/{s.pricing_unit === "per_kg" ? "kg" : "item"} ·{" "}
                        {s.turnaround_hours}h turnaround
                      </p>
                    </div>
                    {selected && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-xl font-bold text-ink">What&apos;s in the bag?</h1>

            <div>
              <span className="text-sm font-medium text-ink">Number of bags</span>
              <div className="mt-2">
                <Stepper value={bagCount} onChange={setBagCount} min={1} max={5} />
              </div>
            </div>

            <div>
              <p className="text-sm text-muted">
                Declaring what&apos;s inside helps us check everything comes back.
              </p>
              <button
                type="button"
                onClick={goNext}
                className="mt-1 min-h-11 text-sm text-primary underline"
              >
                Skip this
              </button>

              <div className="mt-3 flex flex-col divide-y divide-line rounded-card border border-line bg-card">
                {ITEM_CATEGORIES.map((cat) => (
                  <div key={cat.key} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-ink">{cat.label}</span>
                    <Stepper
                      value={itemCounts[cat.key] ?? 0}
                      onChange={(v) => setItemCount(cat.key, v)}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-xl font-bold text-ink">Pick a pickup slot</h1>

            <div className="no-scrollbar -mx-screen flex gap-2 overflow-x-auto px-screen">
              {weekDates.map((date) => {
                const key = format(date, "yyyy-MM-dd");
                const selected = key === selectedDateKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "flex shrink-0 flex-col items-center gap-0.5 rounded-card px-3 py-2",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "border border-line bg-card text-ink",
                    )}
                  >
                    <span className="text-xs">{isToday(date) ? "Today" : format(date, "EEEEE")}</span>
                    <span className="text-base font-semibold tabular-nums">{format(date, "d")}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              {dayFull ? (
                <p className="text-sm text-muted">
                  No slots left on this day.
                  {nextAvailableDay ? ` Try ${format(nextAvailableDay, "EEEE")}.` : ""}
                </p>
              ) : (
                daySlots.map((slot) => {
                  const remaining = slot.capacity - slot.booked_count;
                  const full = remaining <= 0;
                  const selected = slot.id === selectedSlotId;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={full}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={cn(
                        "flex items-center justify-between rounded-card border p-3.5 text-left",
                        full
                          ? "cursor-not-allowed border-line bg-card opacity-50"
                          : selected
                            ? "border-primary bg-primary-soft"
                            : "border-line bg-card",
                      )}
                    >
                      <span>
                        <span className="block text-sm font-medium text-ink">
                          {formatSlotWindow(slot.start_time, slot.end_time)}
                        </span>
                        <span className="text-xs text-muted">
                          {slot.partner?.full_name ?? "Partner"}
                        </span>
                      </span>
                      <span className="text-sm text-muted">
                        {full ? "Full" : `${remaining} spot${remaining === 1 ? "" : "s"} left`}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {profile && (
              <div className="mt-2 rounded-card border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">Pickup address</p>
                    <p className="mt-1 text-sm text-muted">
                      {[profile.village, profile.block, profile.floor].filter(Boolean).join(", ")}
                      {profile.room_number ? `, Room ${profile.room_number}` : ""}
                    </p>
                    <p className="text-sm text-muted">
                      {pickupPointLabel(profile.pickup_point)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddressSheetOpen(true)}
                    className="shrink-0 min-h-11 text-sm text-primary underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-xl font-bold text-ink">Confirm your pickup</h1>

            <div className="overflow-hidden rounded-card border border-line bg-card">
              <div className="flex">
                <div className="flex w-[30%] shrink-0 flex-col items-center justify-center border-r border-dashed border-line bg-accent/15 px-2 py-6">
                  <p className="font-display text-2xl font-bold tabular-nums text-ink">
                    {bagCount}
                  </p>
                  <p className="text-xs text-muted">{bagCount === 1 ? "bag" : "bags"}</p>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 px-4 py-4">
                  <p className="text-base font-semibold text-ink">{selectedService?.name}</p>
                  <p className="text-sm text-ink">
                    Pickup {formatDayLabel(selectedDate)}
                    {selectedSlot ? `, ${formatSlotWindow(selectedSlot.start_time, selectedSlot.end_time)}` : ""}
                  </p>
                  {selectedSlot?.partner?.full_name && (
                    <p className="text-sm text-muted">
                      Collected by {selectedSlot.partner.full_name}
                    </p>
                  )}
                  {selectedService && (
                    <p className="text-sm text-muted">
                      Estimated delivery{" "}
                      {formatDayLabel(
                        addDays(
                          selectedDate,
                          Math.round(selectedService.turnaround_hours / 24),
                        ),
                      )}
                    </p>
                  )}
                  {profile && (
                    <p className="text-sm text-muted">
                      {[profile.block, profile.room_number ? `Room ${profile.room_number}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="border-t border-line px-4 py-3">
                {isCoveredByPlan ? (
                  <>
                    <p className="text-sm font-medium text-ink">
                      Covered by your {planRow?.plans.name} plan ·{" "}
                      {estimate?.weightKg.toFixed(1)} kg estimated
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Exact weight confirmed after weighing.
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-ink">
                    ~₹{estimate?.amount ?? 0} estimated
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-ink" htmlFor="special-instructions">
                Anything specific for this order?
              </label>
              <textarea
                id="special-instructions"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
                placeholder="E.g. handle the blazer with care"
                className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
              />
            </div>

            {confirmError && <p className="text-sm text-danger">{confirmError}</p>}
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-line bg-card px-screen py-3 shadow-float">
        <div className="text-sm font-medium text-ink">
          {!selectedService
            ? "Select a service"
            : isCoveredByPlan
              ? "Covered by your plan"
              : `~₹${estimate?.amount ?? 0} estimated`}
        </div>
        {step < 4 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className="h-11 rounded-control bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={confirming}
            className="h-11 rounded-control bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-70"
          >
            {confirming ? "Confirming…" : "Confirm pickup"}
          </button>
        )}
      </div>
    </div>
  );
}
