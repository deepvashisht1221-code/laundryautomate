import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export function RequirePartnerAuth({ children }: { children: ReactNode }) {
  const { status, profile } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (status === "signed_out") {
    return <Navigate to="/partner/login" replace />;
  }

  if (profile && profile.role !== "partner") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
