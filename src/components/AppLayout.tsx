import { Outlet } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { RefreshProvider, useActiveRefreshHandler } from "@/lib/refresh-context";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

function AppLayoutInner() {
  const handler = useActiveRefreshHandler();
  const pull = usePullToRefresh(async () => {
    if (handler) await handler();
  });
  const touchHandlers = handler ? pull.handlers : {};

  return (
    <div className="flex flex-1 flex-col">
      <main
        ref={pull.containerRef}
        {...touchHandlers}
        className="flex-1 overflow-y-auto px-screen py-screen"
      >
        {handler && (
          <div
            aria-hidden="true"
            className="flex items-center justify-center overflow-hidden text-primary transition-[height]"
            style={{ height: pull.refreshing ? 40 : pull.pullDistance }}
          >
            <RefreshCw
              size={18}
              className={pull.refreshing || pull.triggerReady ? "animate-spin" : ""}
            />
          </div>
        )}
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}

export function AppLayout() {
  return (
    <RefreshProvider>
      <AppLayoutInner />
    </RefreshProvider>
  );
}
