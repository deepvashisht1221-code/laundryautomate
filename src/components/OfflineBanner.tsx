import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-ink px-screen py-2 text-center text-xs font-medium text-card">
      <WifiOff size={14} />
      You&apos;re offline — showing your last saved status.
    </div>
  );
}
