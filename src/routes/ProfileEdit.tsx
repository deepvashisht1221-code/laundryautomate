import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Enums } from "@/types/database";
import { cn } from "@/lib/utils";
import { VILLAGE_BLOCKS, FLOORS, PICKUP_POINTS } from "@/lib/locations";
import { TextField, SelectField } from "@/components/FormField";

const STUDENT_ID_RE = /^\d{2}[A-Z]{2}\d{4}$/;
const NOTES_MAX = 200;

type FormState = {
  studentId: string;
  phone: string;
  whatsappSame: boolean;
  village: string;
  block: string;
  floor: string;
  roomNumber: string;
  pickupPoint: Enums<"pickup_point_type"> | "";
  notes: string;
};

export function ProfileEdit() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const initial: FormState = {
    studentId: profile?.student_id ?? "",
    phone: (profile?.phone ?? "").replace(/^\+91/, "").replace(/\D/g, "").slice(-10),
    whatsappSame: profile?.whatsapp_same_as_phone ?? true,
    village: profile?.village ?? "",
    block: profile?.block ?? "",
    floor: profile?.floor ?? "",
    roomNumber: profile?.room_number ?? "",
    pickupPoint: profile?.pickup_point ?? "",
    notes: profile?.partner_notes ?? "",
  };

  const [form, setForm] = useState<FormState>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => setToastVisible(false), 2400);
    return () => clearTimeout(timer);
  }, [toastVisible]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function markTouched(key: keyof FormState) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  const studentIdValid = STUDENT_ID_RE.test(form.studentId);
  const phoneValid = /^\d{10}$/.test(form.phone);
  const addressValid = Boolean(
    form.village && form.block && form.floor && form.roomNumber.trim() && form.pickupPoint,
  );
  const formValid = studentIdValid && phoneValid && addressValid;

  const dirty = (Object.keys(initial) as (keyof FormState)[]).some(
    (key) => form[key] !== initial[key],
  );

  async function handleSave() {
    if (!user || !formValid || !dirty) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        student_id: form.studentId,
        phone: `+91${form.phone}`,
        whatsapp_same_as_phone: form.whatsappSame,
        village: form.village,
        block: form.block,
        floor: form.floor,
        room_number: form.roomNumber,
        pickup_point: form.pickupPoint || null,
        partner_notes: form.notes.trim() || null,
      })
      .eq("id", user.id);

    setSaving(false);

    if (updateError) {
      setError("Couldn't save your changes. Please try again.");
      return;
    }

    await refreshProfile();
    setToastVisible(true);
  }

  return (
    <div className="relative flex flex-1 flex-col">
      {toastVisible && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-screen">
          <div className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-card shadow-float">
            Changes saved
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 px-screen pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-primary-soft"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Edit profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-screen py-5">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-semibold text-ink">Contact</h2>
            <div className="mt-3 flex flex-col gap-4">
              <div>
                <TextField
                  label="Student ID"
                  value={form.studentId}
                  onChange={(e) => set("studentId", e.target.value.toUpperCase())}
                  onBlur={() => markTouched("studentId")}
                  placeholder="23PG1234"
                  autoCapitalize="characters"
                />
                {touched.studentId && !studentIdValid && (
                  <p className="mt-1 text-sm text-danger">
                    Enter your student ID like 23PG1234 (2 digits, 2 letters, 4 digits).
                  </p>
                )}
              </div>

              <div>
                <span className="text-sm font-medium text-ink">Phone number</span>
                <div className="mt-1 flex items-center rounded-control border border-line bg-card focus-within:border-primary">
                  <span className="pl-3 text-base text-muted">+91</span>
                  <input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onBlur={() => markTouched("phone")}
                    placeholder="98765 43210"
                    inputMode="numeric"
                    className="w-full rounded-control bg-transparent px-2 py-2.5 text-base text-ink focus:outline-none"
                  />
                </div>
                {touched.phone && !phoneValid && (
                  <p className="mt-1 text-sm text-danger">
                    Enter a valid 10-digit phone number.
                  </p>
                )}
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.whatsappSame}
                  onChange={(e) => set("whatsappSame", e.target.checked)}
                  style={{ accentColor: "var(--primary)" }}
                  className="h-5 w-5"
                />
                <span className="text-base text-ink">
                  Use this number for WhatsApp updates too
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-line pt-6">
            <h2 className="text-sm font-semibold text-ink">Pickup address</h2>
            <div className="mt-3 flex flex-col gap-4">
              <SelectField
                label="Village"
                value={form.village}
                onChange={(e) => {
                  set("village", e.target.value);
                  set("block", "");
                }}
                onBlur={() => markTouched("village")}
              >
                <option value="">Select village</option>
                {Object.keys(VILLAGE_BLOCKS).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Block"
                value={form.block}
                onChange={(e) => set("block", e.target.value)}
                onBlur={() => markTouched("block")}
                disabled={!form.village}
              >
                <option value="">Select block</option>
                {(VILLAGE_BLOCKS[form.village] ?? []).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Floor"
                value={form.floor}
                onChange={(e) => set("floor", e.target.value)}
                onBlur={() => markTouched("floor")}
              >
                <option value="">Select floor</option>
                {FLOORS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </SelectField>

              <TextField
                label="Room number"
                value={form.roomNumber}
                onChange={(e) => set("roomNumber", e.target.value)}
                onBlur={() => markTouched("roomNumber")}
                placeholder="214"
              />

              <div>
                <span className="text-sm font-medium text-ink">Pickup point</span>
                <div className="mt-2 flex flex-col gap-3">
                  {PICKUP_POINTS.map((point) => {
                    const selected = form.pickupPoint === point.value;
                    return (
                      <button
                        key={point.value}
                        type="button"
                        onClick={() => {
                          set("pickupPoint", point.value);
                          markTouched("pickupPoint");
                        }}
                        className={cn(
                          "rounded-card border p-4 text-left transition-colors",
                          selected ? "border-primary bg-primary-soft" : "border-line bg-card",
                        )}
                      >
                        <p className="text-base font-semibold text-ink">{point.title}</p>
                        <p className="mt-0.5 text-sm text-muted">{point.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value.slice(0, NOTES_MAX))}
                  placeholder="Ring twice, my roommate sleeps late."
                  rows={4}
                  maxLength={NOTES_MAX}
                  className="w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-right text-xs text-muted">
                  {form.notes.length}/{NOTES_MAX}
                </p>
              </div>

              <div className="rounded-card bg-primary-soft p-4">
                <p className="text-sm leading-5 text-ink">
                  Your laundry partner sees your name, room, phone and notes.
                </p>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </div>

      <div className="border-t border-line bg-card px-screen pb-8 pt-3">
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={!dirty || !formValid || saving}
          className="h-[52px] w-full rounded-control bg-primary text-base font-semibold text-primary-foreground disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
