import { useCallback, useRef, useState, type TouchEvent } from "react";

const MAX_PULL = 80;
const TRIGGER_AT = 56;

export function usePullToRefresh(onRefresh: () => Promise<unknown> | void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el || el.scrollTop > 0 || refreshing) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    },
    [refreshing],
  );

  const onTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (startY.current == null) return;
    const delta = e.touches[0].clientY - startY.current;
    setPullDistance(delta > 0 ? Math.min(delta * 0.5, MAX_PULL) : 0);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (startY.current == null) return;
    startY.current = null;
    if (pullDistance >= TRIGGER_AT && !refreshing) {
      setRefreshing(true);
      Promise.resolve(onRefresh()).finally(() => {
        setRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  return {
    containerRef,
    pullDistance,
    refreshing,
    triggerReady: pullDistance >= TRIGGER_AT,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
