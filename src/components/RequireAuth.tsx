import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, profile } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Loading DhobISB…</p>
      </div>
    );
  }

  if (status === "signed_out") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (status === "domain_not_allowed") {
    return <Navigate to="/login" replace state={{ domainBlocked: true }} />;
  }

  if (profile && !profile.onboarding_complete && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
