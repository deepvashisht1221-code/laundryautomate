import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, CreditCard, Download, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Tables, TablesUpdate } from "@/types/database";
import { initials } from "@/lib/format";
import { pickupPointLabel } from "@/lib/locations";
import { cn } from "@/lib/utils";

type ServiceType = Pick<Tables<"service_types">, "id" | "name">;

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="max-w-[65%] text-right text-ink">{value}</span>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

const THEME_OPTIONS: { value: string; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [services, setServices] = useState<ServiceType[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    supabase
      .from("service_types")
      .select("id, name")
      .eq("is_active", true)
      .then(({ data }) => setServices(data ?? []));
  }, []);

  async function savePreference(fields: TablesUpdate<"profiles">) {
    if (!user) return;
    await supabase.from("profiles").update(fields).eq("id", user.id);
    await refreshProfile();
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  async function handleDeleteAccount() {
    if (!user || deleteText.trim().toLowerCase() !== "delete") return;
    setDeleting(true);
    await supabase.from("profiles").delete().eq("id", user.id);
    await signOut();
    navigate("/login", { replace: true });
  }

  async function handleDownloadData() {
    if (!user) return;
    setDownloading(true);
    try {
      const [ordersRes, notificationsRes, plansRes] = await Promise.all([
        supabase.from("orders").select("*").eq("user_id", user.id),
        supabase.from("notifications").select("*").eq("user_id", user.id),
        supabase.from("user_plans").select("*, plans(*)").eq("user_id", user.id),
      ]);

      const orderIds = (ordersRes.data ?? []).map((o) => o.id);
      const [eventsRes, issuesRes] = orderIds.length
        ? await Promise.all([
            supabase.from("order_events").select("*").in("order_id", orderIds),
            supabase.from("issues").select("*").in("order_id", orderIds),
          ])
        : [{ data: [] }, { data: [] }];

      const payload = {
        profile,
        orders: ordersRes.data ?? [],
        order_events: eventsRes.data ?? [],
        issues: issuesRes.data ?? [],
        notifications: notificationsRes.data ?? [],
        plans: plansRes.data ?? [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dhobisb-my-data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  const whatsappLabel = profile.whatsapp_same_as_phone
    ? "Same as phone number"
    : "Different number";

  return (
    <div className="flex flex-col gap-4 pb-8">
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-screen"
          onClick={() => !deleting && setDeleteOpen(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-card bg-card p-5 shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-ink">Delete your account?</h2>
            <p className="mt-2 text-sm text-muted">
              This permanently removes your profile, order history, and preferences. This
              can&apos;t be undone.
            </p>
            <p className="mt-3 text-sm text-ink">
              Type <span className="font-semibold">delete</span> to confirm.
            </p>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              className="mt-2 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-danger focus:outline-none"
              placeholder="delete"
              autoCapitalize="none"
            />
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleDeleteAccount();
                }}
                disabled={deleteText.trim().toLowerCase() !== "delete" || deleting}
                className="h-11 w-full rounded-control bg-danger text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete my account"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="h-11 w-full rounded-control border border-line text-sm font-semibold text-ink"
              >
                Keep my account
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold uppercase text-primary">
            {initials(profile.full_name)}
          </div>
        )}
        <div>
          <h1 className="font-display text-xl font-bold text-ink">
            {profile.full_name || "—"}
          </h1>
          <p className="text-sm text-muted">{profile.student_id || "No student ID on file"}</p>
          <p className="text-sm text-muted">{profile.email}</p>
        </div>
      </div>

      <Section
        title="Pickup address"
        action={
          <Link to="/profile/edit" className="text-sm font-medium text-primary">
            Edit
          </Link>
        }
      >
        <Row label="Village" value={profile.village || "Not set"} />
        <Row label="Block" value={profile.block || "Not set"} />
        <Row label="Floor" value={profile.floor || "Not set"} />
        <Row label="Room" value={profile.room_number || "Not set"} />
        <Row label="Pickup point" value={pickupPointLabel(profile.pickup_point)} />
        <Row label="Notes for partner" value={profile.partner_notes || "None"} />
        <p className="text-xs text-muted">
          Your laundry partner sees your name, room, phone and notes.
        </p>
      </Section>

      <Section
        title="Contact"
        action={
          <Link to="/profile/edit" className="text-sm font-medium text-primary">
            Edit
          </Link>
        }
      >
        <Row label="Phone" value={profile.phone || "Not set"} />
        <Row label="WhatsApp" value={whatsappLabel} />
      </Section>

      <Section title="Preferences">
        <label className="block">
          <span className="text-sm text-ink">Default service</span>
          <select
            value={profile.default_service_type_id ?? ""}
            onChange={(e) => {
              void savePreference({ default_service_type_id: e.target.value || null });
            }}
            className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
          >
            <option value="">No default</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <Toggle
          label="Pickup reminders"
          checked={profile.notify_pickup_reminders}
          onChange={(v) => {
            void savePreference({ notify_pickup_reminders: v });
          }}
        />
        <Toggle
          label="Status updates"
          checked={profile.notify_status_updates}
          onChange={(v) => {
            void savePreference({ notify_status_updates: v });
          }}
        />
        <Toggle
          label="Delivery alerts"
          checked={profile.notify_delivery_alerts}
          onChange={(v) => {
            void savePreference({ notify_delivery_alerts: v });
          }}
        />
        <Toggle
          label="Offers"
          checked={profile.notify_offers}
          onChange={(v) => {
            void savePreference({ notify_offers: v });
          }}
        />

        <label className="block">
          <span className="text-sm text-ink">Theme</span>
          <select
            value={profile.theme_preference}
            onChange={(e) => {
              void savePreference({ theme_preference: e.target.value });
            }}
            className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
          >
            {THEME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </Section>

      <Section title="Account">
        <Link to="/plan" className="flex items-center justify-between text-sm">
          <span className="text-ink">Your plan</span>
          <ChevronRight size={16} className="text-muted" />
        </Link>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-ink">
            <CreditCard size={16} className="text-muted" />
            Payment methods
          </span>
          <span className="text-muted">None added</span>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleDownloadData();
          }}
          disabled={downloading}
          className="flex items-center gap-2 text-sm text-ink disabled:opacity-60"
        >
          <Download size={16} className="text-muted" />
          {downloading ? "Preparing your data…" : "Download my data"}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleSignOut();
          }}
          className="flex items-center gap-2 text-sm text-ink"
        >
          <LogOut size={16} className="text-muted" />
          Sign out
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="flex items-center gap-2 text-sm text-danger"
        >
          <Trash2 size={16} />
          Delete account
        </button>
      </Section>
    </div>
  );
}
