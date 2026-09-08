import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { MicrosoftMark } from "@/components/MicrosoftMark";

const PENDING_KEY = "dhobisb.oauthPending";

export function Login() {
  const { status, blockedEmail, signInWithMicrosoft, clearDomainBlock } =
    useAuth();
  const [isSigningIn, setIsSigningIn] = useState(
    () => sessionStorage.getItem(PENDING_KEY) === "1",
  );
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "loading" && isSigningIn) {
      setIsSigningIn(false);
      sessionStorage.removeItem(PENDING_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handleContinue() {
    setSignInError(null);
    setIsSigningIn(true);
    sessionStorage.setItem(PENDING_KEY, "1");

    const { error } = await signInWithMicrosoft();
    if (error) {
      sessionStorage.removeItem(PENDING_KEY);
      setIsSigningIn(false);
      setSignInError("Couldn't reach Microsoft. Check your connection and try again.");
    }
    // On success the browser is redirected away, so nothing else to do here.
  }

  function handleTryDifferentAccount() {
    clearDomainBlock();
    setSignInError(null);
  }

  const showBlocked = status === "domain_not_allowed";

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-20%] top-[-15%] h-[65%] rounded-b-[50%] bg-[radial-gradient(ellipse_at_top,_rgba(14,92,99,0.28),_rgba(14,92,99,0.08)_55%,_transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-10%] top-[6%] h-[40%] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(220,235,234,0.9),_transparent_70%)] blur-2xl"
      />

      <div className="relative flex flex-[2] flex-col items-center justify-center px-screen text-center">
        <h1 className="font-display text-2xl font-bold text-ink">DhobISB</h1>
        <p className="mt-2 max-w-[280px] text-base text-muted">
          Laundry pickup and delivery for your block.
        </p>
      </div>

      <div className="relative flex flex-1 flex-col justify-end px-screen pb-8">
        {showBlocked ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-line bg-card p-4">
              <p className="text-base leading-6 text-ink">
                DhobISB is only open to university accounts. You signed in
                with {blockedEmail ?? "an account we don't recognize"}.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTryDifferentAccount}
              className="h-[52px] w-full rounded-control bg-primary text-base font-semibold text-primary-foreground"
            >
              Try a different account
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {signInError && (
              <p className="text-sm text-danger">{signInError}</p>
            )}

            <button
              type="button"
              onClick={() => {
                void handleContinue();
              }}
              disabled={isSigningIn}
              className="flex h-[52px] w-full items-center justify-center gap-3 rounded-control bg-primary text-base font-semibold text-primary-foreground disabled:opacity-70"
            >
              {isSigningIn ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Signing you in
                </>
              ) : (
                <>
                  <MicrosoftMark className="h-5 w-5" />
                  Continue with Microsoft
                </>
              )}
            </button>

            <p className="text-center text-sm text-muted">
              Use your university account.
            </p>

            <p className="text-center text-xs text-muted">
              <a href="/terms" className="underline">
                Terms
              </a>
              <span className="mx-2">·</span>
              <a href="/privacy" className="underline">
                Privacy
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
