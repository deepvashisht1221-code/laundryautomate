import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  action,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card bg-card p-6 text-center shadow-elevation-1">
      {icon}
      <p className="text-base text-ink">{title}</p>
      {action}
    </div>
  );
}
