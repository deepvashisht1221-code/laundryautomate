import { useState } from "react";
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

export function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const [studentId, setStudentId] = useState(profile?.student_id ?? "");
  const [phone, setPhone] = useState(
    (profile?.phone ?? "").replace(/^\+91/, "").replace(/\D/g, "").slice(-10),
  );
  const [whatsappSame, setWhatsappSame] = useState(
    profile?.whatsapp_same_as_phone ?? true,
  );

  const [village, setVillage] = useState(profile?.village ?? "");
  const [block, setBlock] = useState(profile?.block ?? "");
  const [floor, setFloor] = useState(profile?.floor ?? "");
  const [roomNumber, setRoomNumber] = useState(profile?.room_number ?? "");
  const [pickupPoint, setPickupPoint] = useState<Enums<"pickup_point_type"> | "">(
    profile?.pickup_point ?? "",
  );

  const [notes, setNotes] = useState(profile?.partner_notes ?? "");

  const fullName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "";
  const email = user?.email ?? "";

  const studentIdValid = STUDENT_ID_RE.test(studentId);
  const phoneValid = /^\d{10}$/.test(phone);
  const step1Valid = studentIdValid && phoneValid;
  const step2Valid = Boolean(village && block && floor && roomNumber.trim() && pickupPoint);

  function goNext() {
    setAttempted(true);
    if (step === 1 && !step1Valid) return;
    if (step === 2 && !step2Valid) return;
    setAttempted(false);
    setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  async function finish(notesOverride: string | null) {
    if (!user) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        email,
        student_id: studentId,
        phone: `+91${phone}`,
        whatsapp_same_as_phone: whatsappSame,
        village,
        block,
        floor,
        room_number: roomNumber,
        pickup_point: pickupPoint || null,
        partner_notes: notesOverride,
        onboarding_complete: true,
      })
      .eq("id", user.id);

    setSaving(false);

    if (updateError) {
      setError("Couldn't save your details. Please try again.");
      return;
    }

    await refreshProfile();
    navigate("/", { replace: true });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 px-screen pt-4">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 1}
          aria-label="Back"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            step === 1 ? "invisible" : "text-ink hover:bg-primary-soft",
          )}
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex flex-1 gap-1.5">
          {[1, 2, 3].map((s) => (
            <div key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className={cn(
                  "h-full rounded-full bg-primary transition-all",
                  s <= step ? "w-full" : "w-0",
                )}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-screen py-6">
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-2xl font-bold text-ink">
              Let's set you up
            </h1>

            <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-4">
              <div>
                <span className="text-sm text-muted">Full name</span>
                <p className="text-base text-ink">{fullName || "—"}</p>
              </div>
              <div>
                <span className="text-sm text-muted">Email</span>
                <p className="text-base text-ink">{email || "—"}</p>
              </div>
              <p className="text-xs text-muted">From your university account.</p>
            </div>

            <div>
              <TextField
                label="Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                placeholder="23PG1234"
                autoCapitalize="characters"
              />
              {attempted && !studentIdValid && (
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
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="98765 43210"
                  inputMode="numeric"
                  className="w-full rounded-control bg-transparent px-2 py-2.5 text-base text-ink focus:outline-none"
                />
              </div>
              {attempted && !phoneValid && (
                <p className="mt-1 text-sm text-danger">
                  Enter a valid 10-digit phone number.
                </p>
              )}
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={whatsappSame}
                onChange={(e) => setWhatsappSame(e.target.checked)}
                style={{ accentColor: "var(--primary)" }}
                className="h-5 w-5"
              />
              <span className="text-base text-ink">
                Use this number for WhatsApp updates too
              </span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-2xl font-bold text-ink">
              Where should we collect from?
            </h1>

            <div className="flex flex-col gap-4">
              <SelectField
                label="Village"
                value={village}
                onChange={(e) => {
                  setVillage(e.target.value);
                  setBlock("");
                }}
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
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                disabled={!village}
              >
                <option value="">Select block</option>
                {(VILLAGE_BLOCKS[village] ?? []).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Floor"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
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
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="214"
              />
            </div>

            <div>
              <span className="text-sm font-medium text-ink">Pickup point</span>
              <div className="mt-2 flex flex-col gap-3">
                {PICKUP_POINTS.map((point) => {
                  const selected = pickupPoint === point.value;
                  return (
                    <button
                      key={point.value}
                      type="button"
                      onClick={() => setPickupPoint(point.value)}
                      className={cn(
                        "rounded-card border p-4 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary-soft"
                          : "border-line bg-card",
                      )}
                    >
                      <p className="text-base font-semibold text-ink">
                        {point.title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        {point.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              {attempted && !pickupPoint && (
                <p className="mt-1 text-sm text-danger">
                  Choose where we should collect your bag from.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-2xl font-bold text-ink">
              Anything your laundry partner should know?
            </h1>

            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
                placeholder="Ring twice, my roommate sleeps late."
                rows={4}
                maxLength={NOTES_MAX}
                className="w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-muted">
                {notes.length}/{NOTES_MAX}
              </p>
            </div>

            <div className="rounded-card bg-primary-soft p-4">
              <p className="text-sm leading-5 text-ink">
                Your name, room, phone and these notes are shared with the
                laundry partner assigned to your order. Nothing else is.
              </p>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-screen pb-8 pt-2">
        {step < 3 ? (
          <button
            type="button"
            onClick={goNext}
            className="h-[52px] w-full rounded-control bg-primary text-base font-semibold text-primary-foreground"
          >
            Continue
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void finish(notes.trim() || null);
              }}
              className="h-[52px] w-full rounded-control bg-primary text-base font-semibold text-primary-foreground disabled:opacity-70"
            >
              {saving ? "Setting up your account…" : "Finish setup"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void finish(null);
              }}
              className="text-center text-sm text-muted underline"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
