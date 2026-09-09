import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type RefreshFn = () => Promise<unknown> | void;

type Slot = { fn: RefreshFn } | null;

type RefreshContextValue = {
  slot: Slot;
  setSlot: (slot: Slot) => void;
};

const RefreshContext = createContext<RefreshContextValue | undefined>(undefined);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<Slot>(null);
  return <RefreshContext.Provider value={{ slot, setSlot }}>{children}</RefreshContext.Provider>;
}

function useRefreshContext() {
  const ctx = useContext(RefreshContext);
  if (!ctx) throw new Error("useRefreshContext must be used within a RefreshProvider");
  return ctx;
}

export function useRegisterRefresh(fn: RefreshFn) {
  const { setSlot } = useRefreshContext();
  useEffect(() => {
    setSlot({ fn });
    return () => setSlot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn]);
}

export function useActiveRefreshHandler() {
  return useRefreshContext().slot?.fn ?? null;
}
