import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  INSTRUMENT_IDS,
  STRATEGIES,
  TIMEFRAMES,
  type InstrumentId,
  type StrategyId,
  type Timeframe,
} from "@/lib/market/types";

export type ChartMode = "analysis" | "live";
export type MobilePane = "chart" | "signals" | "scanner";

type DeskState = {
  hydrated: boolean;
  instrumentId: InstrumentId;
  timeframe: Timeframe;
  chartMode: ChartMode;
  mobilePane: MobilePane;
  selectedSignalId: string | null;
  notifyEnabled: boolean;
  minQuality: number;
  enabledStrategies: Record<StrategyId, boolean>;
  enabledTimeframes: Record<Timeframe, boolean>;
  enabledInstruments: Record<InstrumentId, boolean>;
  soundEnabled: boolean;
  seenSignalIds: string[];
  settingsOpen: boolean;
  setHydrated: () => void;
  setInstrument: (id: InstrumentId) => void;
  setTimeframe: (tf: Timeframe) => void;
  setChartMode: (mode: ChartMode) => void;
  setMobilePane: (pane: MobilePane) => void;
  setSelectedSignalId: (id: string | null) => void;
  setNotifyEnabled: (value: boolean) => void;
  setMinQuality: (value: number) => void;
  toggleStrategy: (id: StrategyId) => void;
  toggleTimeframe: (id: Timeframe) => void;
  toggleInstrument: (id: InstrumentId) => void;
  setSoundEnabled: (value: boolean) => void;
  markSeen: (ids: string[]) => void;
  setSettingsOpen: (value: boolean) => void;
};

function everyTrue<T extends string>(keys: readonly T[]): Record<T, boolean> {
  return Object.fromEntries(keys.map((key) => [key, true])) as Record<T, boolean>;
}

export const useDeskStore = create<DeskState>()(
  persist(
    (set) => ({
      hydrated: false,
      instrumentId: "GOLD",
      timeframe: "15m",
      chartMode: "analysis",
      mobilePane: "chart",
      selectedSignalId: null,
      notifyEnabled: false,
      minQuality: 74,
      enabledStrategies: everyTrue(STRATEGIES),
      enabledTimeframes: everyTrue(TIMEFRAMES),
      enabledInstruments: everyTrue(INSTRUMENT_IDS),
      soundEnabled: true,
      seenSignalIds: [],
      settingsOpen: false,
      setHydrated: () => set({ hydrated: true }),
      setInstrument: (instrumentId) =>
        set({ instrumentId, selectedSignalId: null, mobilePane: "chart" }),
      setTimeframe: (timeframe) => set({ timeframe, selectedSignalId: null }),
      setChartMode: (chartMode) => set({ chartMode }),
      setMobilePane: (mobilePane) => set({ mobilePane }),
      setSelectedSignalId: (selectedSignalId) => set({ selectedSignalId }),
      setNotifyEnabled: (notifyEnabled) => set({ notifyEnabled }),
      setMinQuality: (minQuality) => set({ minQuality }),
      toggleStrategy: (id) =>
        set((state) => ({
          enabledStrategies: {
            ...state.enabledStrategies,
            [id]: !state.enabledStrategies[id],
          },
        })),
      toggleTimeframe: (id) =>
        set((state) => ({
          enabledTimeframes: {
            ...state.enabledTimeframes,
            [id]: !state.enabledTimeframes[id],
          },
        })),
      toggleInstrument: (id) =>
        set((state) => ({
          enabledInstruments: {
            ...state.enabledInstruments,
            [id]: !state.enabledInstruments[id],
          },
        })),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      markSeen: (ids) =>
        set((state) => ({
          seenSignalIds: [...new Set([...state.seenSignalIds, ...ids])].slice(-400),
        })),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
    }),
    {
      name: "meridian-desk",
      skipHydration: true,
      partialize: (state) => ({
        instrumentId: state.instrumentId,
        timeframe: state.timeframe,
        notifyEnabled: state.notifyEnabled,
        minQuality: state.minQuality,
        enabledStrategies: state.enabledStrategies,
        enabledTimeframes: state.enabledTimeframes,
        enabledInstruments: state.enabledInstruments,
        soundEnabled: state.soundEnabled,
        seenSignalIds: state.seenSignalIds,
      }),
    },
  ),
);
