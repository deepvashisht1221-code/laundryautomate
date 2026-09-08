import { Link } from "react-router-dom";
import type { Enums } from "@/types/database";
import { STATUS_META, STAGE_OF_STATUS } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OrderStubCard({
  orderId,
  orderCode,
  serviceName,
  status,
  milestone,
  showProgress = false,
  className,
}: {
  orderId: string;
  orderCode: string;
  serviceName: string;
  status: Enums<"order_status_type">;
  milestone: string;
  showProgress?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const stage = STAGE_OF_STATUS[status];

  return (
    <Link
      to={`/orders/${orderId}`}
      className={cn("block overflow-hidden rounded-card border border-line bg-card", className)}
    >
      <div className="flex">
        <div className="flex w-[36%] shrink-0 items-center justify-center border-r border-dashed border-line bg-accent/15 px-2 py-6">
          <p className="font-display text-lg font-bold tabular-nums leading-tight text-ink whitespace-nowrap">
            {orderCode}
          </p>
        </div>
        <div className="flex-1 px-4 py-4">
          <p className="text-base font-semibold text-ink">{serviceName}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
            <span className="text-sm text-muted">{meta.label}</span>
          </div>
          <p className="mt-2 text-sm text-ink">{milestone}</p>
        </div>
      </div>
      {showProgress && (
        <div className="flex gap-1 px-4 pb-4">
          {[1, 2, 3, 4].map((seg) => (
            <div
              key={seg}
              className={cn("h-1 flex-1 rounded-full", seg <= stage ? "bg-primary" : "bg-line")}
            />
          ))}
        </div>
      )}
    </Link>
  );
}
