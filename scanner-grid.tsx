import { INSTRUMENTS, TIMEFRAME_META } from "@/lib/market/symbols";
import { TIMEFRAMES, type InstrumentId, type Timeframe, type TradeSignal } from "@/lib/market/types";
import { useDeskStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ScannerGrid({ signals }: { signals: TradeSignal[] }) {
  const setInstrument = useDeskStore((s) => s.setInstrument);
  const setTimeframe = useDeskStore((s) => s.setTimeframe);
  const setSelectedSignalId = useDeskStore((s) => s.setSelectedSignalId);
  const setMobilePane = useDeskStore((s) => s.setMobilePane);
  const setChartMode = useDeskStore((s) => s.setChartMode);

  const best = new Map<string, TradeSignal>();
  for (const signal of signals) {
    const key = `${signal.instrumentId}-${signal.timeframe}`;
    const prev = best.get(key);
    if (!prev || signal.quality > prev.quality) best.set(key, signal);
  }

  return (
    <div className="overflow-x-auto px-3 pb-4 md:px-4">
      <table className="w-full min-w-[520px] border-separate border-spacing-y-1 text-left">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <th className="px-2 py-2 font-medium">Market</th>
            {TIMEFRAMES.map((tf) => (
              <th key={tf} className="px-2 py-2 font-medium">
                {TIMEFRAME_META[tf].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INSTRUMENTS.map((item) => (
            <tr key={item.id}>
              <td className="rounded-l-md bg-card px-3 py-2.5">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.name}</p>
              </td>
              {TIMEFRAMES.map((tf) => {
                const signal = best.get(`${item.id}-${tf}`);
                return (
                  <td key={tf} className="bg-card px-2 py-2 last:rounded-r-md">
                    <Cell
                      signal={signal}
                      onOpen={() => {
                        if (!signal) {
                          setInstrument(item.id);
                          setTimeframe(tf);
                          setMobilePane("chart");
                          return;
                        }
                        setInstrument(signal.instrumentId);
                        setTimeframe(signal.timeframe);
                        setSelectedSignalId(signal.id);
                        setChartMode("analysis");
                        setMobilePane("chart");
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({
  signal,
  onOpen,
}: {
  signal: TradeSignal | undefined;
  onOpen: () => void;
}) {
  if (!signal) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex h-12 w-full items-center justify-center rounded-md text-xs text-muted-foreground hover:bg-muted"
      >
        Quiet
      </button>
    );
  }
  const buy = signal.side === "buy";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex h-12 w-full flex-col items-start justify-center rounded-md px-2 text-left",
        buy ? "bg-buy/10" : "bg-sell/10",
      )}
    >
      <span className={cn("text-xs font-medium", buy ? "text-buy" : "text-sell")}>
        {buy ? "BUY" : "SELL"} {signal.quality}
      </span>
      <span className="truncate text-[11px] text-muted-foreground">{signal.patternName}</span>
    </button>
  );
}

export function pickSignal(
  signals: TradeSignal[],
  instrumentId: InstrumentId,
  timeframe: Timeframe,
  selectedId: string | null,
): TradeSignal | null {
  if (selectedId) {
    const selected = signals.find((s) => s.id === selectedId);
    if (selected) return selected;
  }
  return (
    signals.find(
      (s) => s.instrumentId === instrumentId && s.timeframe === timeframe && s.status === "active",
    ) ??
    signals.find((s) => s.instrumentId === instrumentId && s.timeframe === timeframe) ??
    null
  );
}
