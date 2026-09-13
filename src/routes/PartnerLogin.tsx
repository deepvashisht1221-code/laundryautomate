import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const PARTNER_USERNAME_EMAILS: Record<string, string> = {
  govind: "govind@dhobisb-partner.local",
  pkc: "pkc@dhobisb-partner.local",
};

export function PartnerLogin() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    (location.state as { disabled?: boolean } | null)?.disabled
      ? "This partner account is currently disabled."
      : null,
  );

  useEffect(() => {
    if (profile?.role === "partner" && profile.is_active) {
      navigate("/partner", { replace: true });
    }
  }, [profile, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const email = PARTNER_USERNAME_EMAILS[username.trim().toLowerCase()];
    if (!email) {
      setSubmitting(false);
      setError("Invalid username or password.");
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setSubmitting(false);
      setError("Invalid username or password.");
      return;
    }

    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", signInData.user.id)
      .maybeSingle();

    setSubmitting(false);

    if (partnerProfile && !partnerProfile.is_active) {
      await supabase.auth.signOut();
      setError("This partner account is currently disabled.");
      return;
    }

    navigate("/partner", { replace: true });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-screen">
      <div className="w-full max-w-[320px]">
        <h1 className="font-display text-2xl font-bold text-ink">Partner sign in</h1>
        <p className="mt-1 text-sm text-muted">DhobISB laundry partner portal</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="block">
            <span className="text-sm font-medium text-ink">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              className="mt-1 w-full rounded-t-control border-0 border-b-2 border-line bg-surface-variant px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-t-control border-0 border-b-2 border-line bg-surface-variant px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="h-[52px] w-full rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-elevation-1 disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
