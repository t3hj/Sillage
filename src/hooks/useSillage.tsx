import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SillageData } from "@/data/types";
import { emptyData, loadData, saveData } from "@/lib/storage";

interface Ctx {
  data: SillageData;
  hydrated: boolean;
  update: (fn: (d: SillageData) => SillageData) => void;
  replace: (d: SillageData) => void;
}

const SillageContext = createContext<Ctx | null>(null);

export function SillageProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SillageData>(emptyData);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setData(loadData());
    setHydrated(true);
  }, []);

  const update = useCallback((fn: (d: SillageData) => SillageData) => {
    setData((prev) => {
      const next = fn(prev);
      saveData(next);
      return next;
    });
  }, []);

  const replace = useCallback((d: SillageData) => {
    setData(d);
    saveData(d);
  }, []);

  const value = useMemo(
    () => ({ data, hydrated, update, replace }),
    [data, hydrated, update, replace],
  );

  return <SillageContext.Provider value={value}>{children}</SillageContext.Provider>;
}

export function useSillage() {
  const ctx = useContext(SillageContext);
  if (!ctx) throw new Error("useSillage must be used inside SillageProvider");
  return ctx;
}
