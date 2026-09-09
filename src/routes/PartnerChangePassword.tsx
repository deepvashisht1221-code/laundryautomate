import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function PartnerChangePassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const passwordValid = password.length >= 8;
  const matches = password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid || !matches) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError("Couldn't update your password. Please try again.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 px-screen pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-primary-soft"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Change password</h1>
      </div>

      <div className="flex-1 px-screen py-5">
        {done ? (
          <div className="flex flex-col items-center gap-3 pt-12 text-center">
            <p className="text-base text-ink">Your password has been updated.</p>
            <button
              type="button"
              onClick={() => navigate("/partner")}
              className="mt-2 h-11 rounded-control bg-primary px-6 text-sm font-semibold text-primary-foreground"
            >
              Back to dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm font-medium text-ink">New password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
              />
              {password.length > 0 && !passwordValid && (
                <p className="mt-1 text-sm text-danger">
                  Use at least 8 characters.
                </p>
              )}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Confirm new password</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
              />
              {confirm.length > 0 && !matches && (
                <p className="mt-1 text-sm text-danger">Passwords don&apos;t match.</p>
              )}
            </label>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={saving || !passwordValid || !matches}
              className="h-[52px] w-full rounded-control bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
