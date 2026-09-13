import { AlertCircle } from "lucide-react";

export function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-card p-6 text-center shadow-elevation-1">
      <AlertCircle size={22} className="text-danger" />
      <p className="text-sm text-ink">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex h-11 items-center justify-center rounded-full border border-primary px-5 text-sm font-semibold text-primary"
      >
        Try again
      </button>
    </div>
  );
}
