import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export function Login() {
  const { signInWithMicrosoft } = useAuth();
  const location = useLocation();
  const domainBlocked = Boolean(
    (location.state as { domainBlocked?: boolean } | null)?.domainBlocked,
  );

  return (
    <div className="flex flex-1 flex-col justify-center px-screen py-screen">
      <div className="mb-10 text-center">
        <p className="font-display text-2xl font-bold text-ink">DhobISB</p>
        <p className="mt-2 text-base text-muted">
          Pickup and delivery laundry, right from your block.
        </p>
      </div>

      {domainBlocked && (
        <div className="mb-6 rounded-card border border-line bg-card p-4">
          <p className="text-base font-medium text-ink">
            Only university accounts can sign in
          </p>
          <p className="mt-1 text-sm text-muted">
            We couldn&apos;t verify your account against the university.
            Sign in with your university Microsoft account to continue.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          void signInWithMicrosoft();
        }}
        className="h-[52px] w-full rounded-control bg-primary text-base font-semibold text-primary-foreground"
      >
        Sign in with Microsoft
      </button>
    </div>
  );
}
