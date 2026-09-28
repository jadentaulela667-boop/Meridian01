import { useEffect, useMemo, type ReactNode } from "react";
import { Bell, CandlestickChart, LayoutGrid, ListFilter, Radio } from "lucide-react";
import { toast } from "sonner";
import { useChartData, useMarketScan } from "@/hooks/use-market";
import { formatPrice, INSTRUMENT_MAP, TIMEFRAME_META } from "@/lib/market/symbols";
import { TIMEFRAMES, type Quote, type TradeSignal } from "@/lib/market/types";
import { playPing, pushDesktopAlert } from "@/lib/notifications";
import { useDeskStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnalysisChart } from "./analysis-chart";
import { InstrumentBar } from "./instrument-bar";
import { pickSignal, ScannerGrid } from "./scanner-grid";
import { SettingsPanel } from "./settings-panel";
import { SignalCard } from "./signal-card";
import { LiveTvChart } from "./tv-chart";

export function MeridianApp() {
  const instrumentId = useDeskStore((s) => s.instrumentId);
  const timeframe = useDeskStore((s) => s.timeframe);
  const setTimeframe = useDeskStore((s) => s.setTimeframe);
  const chartMode = useDeskStore((s) => s.chartMode);
  const setChartMode = useDeskStore((s) => s.setChartMode);
  const mobilePane = useDeskStore((s) => s.mobilePane);
  const setMobilePane = useDeskStore((s) => s.setMobilePane);
  const selectedSignalId = useDeskStore((s) => s.selectedSignalId);
  const setSelectedSignalId = useDeskStore((s) => s.setSelectedSignalId);
  const setSettingsOpen = useDeskStore((s) => s.setSettingsOpen);
  const hydrated = useDeskStore((s) => s.hydrated);
  const notifyEnabled = useDeskStore((s) => s.notifyEnabled);
  const soundEnabled = useDeskStore((s) => s.soundEnabled);
  const minQuality = useDeskStore((s) => s.minQuality);
  const enabledStrategies = useDeskStore((s) => s.enabledStrategies);
  const enabledTimeframes = useDeskStore((s) => s.enabledTimeframes);
  const enabledInstruments = useDeskStore((s) => s.enabledInstruments);
  const seenSignalIds = useDeskStore((s) => s.seenSignalIds);
  const markSeen = useDeskStore((s) => s.markSeen);

  const chartQuery = useChartData(instrumentId, timeframe);
  const scanQuery = useMarketScan();

  const quotes: Quote[] =
    scanQuery.data?.quotes ?? (chartQuery.data ? [chartQuery.data.quote] : []);
  const allSignals = useMemo(() => {
    const map = new Map<string, TradeSignal>();
    for (const signal of chartQuery.data?.signals ?? []) map.set(signal.id, signal);
    for (const signal of scanQuery.data?.signals ?? []) map.set(signal.id, signal);
    return [...map.values()];
  }, [chartQuery.data, scanQuery.data]);

  const visibleSignals = allSignals.filter(
    (signal) =>
      enabledStrategies[signal.strategy] &&
      enabledTimeframes[signal.timeframe] &&
      enabledInstruments[signal.instrumentId],
  );
  const alertable = visibleSignals.filter(
    (signal) => signal.status === "active" && signal.quality >= minQuality,
  );
  const selected = pickSignal(visibleSignals, instrumentId, timeframe, selectedSignalId);
  const meta = INSTRUMENT_MAP[instrumentId];
  const quote = quotes.find((item) => item.instrumentId === instrumentId);
  const chartPayload =
    chartQuery.data ??
    scanQuery.data?.charts.find(
      (item) => item.instrumentId === instrumentId && item.timeframe === timeframe,
    );

  const alertKey = alertable.map((s) => s.id).join("|");
  useEffect(() => {
    if (!hydrated || !alertable.length) return;
    const fresh = alertable.filter((signal) => !seenSignalIds.includes(signal.id));
    if (!fresh.length) return;
    markSeen(fresh.map((signal) => signal.id));
    const top = [...fresh].sort((a, b) => b.quality - a.quality)[0]!;
    toast.custom(() => (
      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
        <p className="font-medium">
          {top.side === "buy" ? "Buy" : "Sell"} {INSTRUMENT_MAP[top.instrumentId].label}
        </p>
        <p className="mt-1 text-muted-foreground">
          {top.patternName} · {top.timeframe} · Q{top.quality}
        </p>
      </div>
    ));
    if (notifyEnabled) pushDesktopAlert(top);
    if (soundEnabled) playPing();
  }, [alertKey, hydrated, notifyEnabled, soundEnabled, markSeen, seenSignalIds, alertable]);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh lg:overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 md:px-4">
        <div className="min-w-0">
          <p className="font-medium tracking-[0.18em] text-accent">MERIDIAN</p>
          <p className="truncate text-xs text-muted-foreground">
            Harmonic · Wolfe · S/R · 15m / 30m / 1H
          </p>
        </div>
        <div className="flex items-center gap-2">
          {alertable.length > 0 ? (
            <span className="hidden font-mono text-xs tabular-nums text-buy sm:inline">
              {alertable.length} live
            </span>
          ) : (
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              Scanning
            </span>
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label="Alerts and filters"
            onClick={() => setSettingsOpen(true)}
          >
            <Bell className="size-4" />
          </Button>
        </div>
      </header>

      <InstrumentBar quotes={quotes} />

      <div className="flex items-center justify-between gap-2 px-3 pb-2 md:px-4">
        <div className="flex rounded-md border border-border p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={cn(
                "h-9 min-w-12 rounded-sm px-3 text-xs font-medium",
                timeframe === tf ? "bg-secondary text-foreground" : "text-muted-foreground",
              )}
            >
              {TIMEFRAME_META[tf].label}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => setChartMode("analysis")}
            className={cn(
              "h-9 rounded-sm px-3 text-xs font-medium",
              chartMode === "analysis" ? "bg-secondary text-foreground" : "text-muted-foreground",
            )}
          >
            Setups
          </button>
          <button
            type="button"
            onClick={() => setChartMode("live")}
            className={cn(
              "h-9 rounded-sm px-3 text-xs font-medium",
              chartMode === "live" ? "bg-secondary text-foreground" : "text-muted-foreground",
            )}
          >
            Live
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-0 landscape:max-lg:grid landscape:max-lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)]">
        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-col border-border lg:border-r landscape:max-lg:border-r",
            mobilePane === "chart" ? "flex" : "hidden lg:flex landscape:max-lg:flex",
          )}
        >
          <div className="flex items-end justify-between px-3 pb-2 md:px-4">
            <div>
              <h1 className="text-lg font-medium tracking-tight md:text-xl">
                {meta.label}
                <span className="ml-2 text-sm font-normal text-muted-foreground">{meta.name}</span>
              </h1>
              <p className="font-mono text-sm tabular-nums text-muted-foreground">
                {quote ? formatPrice(instrumentId, quote.price) : "Waiting for feed"}
                {quote ? (
                  <span className={quote.changePct >= 0 ? "ml-2 text-buy" : "ml-2 text-sell"}>
                    {quote.changePct >= 0 ? "+" : ""}
                    {quote.changePct.toFixed(2)}%
                  </span>
                ) : null}
              </p>
            </div>
            {selected ? (
              <p className="hidden text-right text-xs text-muted-foreground sm:block">
                {selected.patternName}
                <br />
                Entry {formatPrice(instrumentId, selected.entry)} · Stop{" "}
                {formatPrice(instrumentId, selected.stop)}
              </p>
            ) : null}
          </div>
          <div className="relative min-h-[280px] flex-1 overflow-hidden bg-background landscape:max-lg:min-h-0">
            {chartMode === "live" ? (
              <LiveTvChart symbol={meta.tv} interval={TIMEFRAME_META[timeframe].tv} />
            ) : chartPayload ? (
              <AnalysisChart chart={chartPayload} signal={selected} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {chartQuery.isError ? "Market feed paused. Retrying." : "Loading candles…"}
              </div>
            )}
          </div>
          {selected && chartMode === "analysis" ? (
            <div className="grid grid-cols-2 gap-2 border-t border-border px-3 py-2 font-mono text-xs tabular-nums md:grid-cols-4 md:px-4">
              <Stat label="Entry" value={formatPrice(instrumentId, selected.entry)} />
              <Stat label="Stop" value={formatPrice(instrumentId, selected.stop)} tone="sell" />
              <Stat
                label="TP1"
                value={formatPrice(instrumentId, selected.targets[0] ?? selected.entry)}
                tone="buy"
              />
              <Stat label="R:R" value={`${selected.rr.toFixed(1)}R`} />
            </div>
          ) : null}
        </section>

        <aside
          className={cn(
            "min-h-0 overflow-y-auto pb-20 lg:pb-4 landscape:max-lg:pb-3",
            mobilePane === "signals" || mobilePane === "scanner"
              ? "block"
              : "hidden lg:block landscape:max-lg:block",
          )}
        >
          <div className="flex items-center justify-between px-3 py-3 md:px-4">
            <div className="flex rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setMobilePane("signals")}
                className={cn(
                  "h-8 rounded-sm px-3 text-xs font-medium",
                  mobilePane !== "scanner" ? "bg-secondary text-foreground" : "text-muted-foreground",
                )}
              >
                Setups
              </button>
              <button
                type="button"
                onClick={() => setMobilePane("scanner")}
                className={cn(
                  "h-8 rounded-sm px-3 text-xs font-medium",
                  mobilePane === "scanner" ? "bg-secondary text-foreground" : "text-muted-foreground",
                )}
              >
                Scanner
              </button>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {alertable.length} tradeable
            </p>
          </div>
          {mobilePane === "scanner" ? (
            <ScannerGrid signals={visibleSignals} />
          ) : (
            <div className="space-y-2 px-3 pb-4 md:px-4">
              {visibleSignals.length === 0 ? (
                <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                  {scanQuery.isLoading || chartQuery.isLoading
                    ? "Scanning harmonics, Wolfe waves, and levels…"
                    : "No setups on the active filters. Markets are quiet or still forming."}
                </div>
              ) : (
                visibleSignals.slice(0, 24).map((signal) => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    active={selected?.id === signal.id}
                    onSelect={() => {
                      useDeskStore.getState().setInstrument(signal.instrumentId);
                      useDeskStore.getState().setTimeframe(signal.timeframe);
                      setSelectedSignalId(signal.id);
                      setChartMode("analysis");
                      setMobilePane("chart");
                    }}
                  />
                ))
              )}
            </div>
          )}
        </aside>
      </div>

      <p className="hidden border-t border-border px-4 py-2 text-[11px] text-muted-foreground lg:block">
        Educational analysis on public market data. Not a broker and not financial advice.
      </p>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] lg:hidden landscape:max-lg:hidden">
        <div className="grid grid-cols-4">
          <NavBtn
            label="Chart"
            icon={<CandlestickChart className="size-4" />}
            active={mobilePane === "chart"}
            onClick={() => setMobilePane("chart")}
          />
          <NavBtn
            label="Setups"
            icon={<ListFilter className="size-4" />}
            active={mobilePane === "signals"}
            onClick={() => setMobilePane("signals")}
          />
          <NavBtn
            label="Scanner"
            icon={<LayoutGrid className="size-4" />}
            active={mobilePane === "scanner"}
            onClick={() => setMobilePane("scanner")}
          />
          <NavBtn
            label="Live"
            icon={<Radio className="size-4" />}
            active={chartMode === "live" && mobilePane === "chart"}
            onClick={() => {
              setChartMode("live");
              setMobilePane("chart");
            }}
          />
        </div>
      </nav>
      <SettingsPanel />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "buy" | "sell";
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5",
          tone === "buy" && "text-buy",
          tone === "sell" && "text-sell",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function NavBtn({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-14 flex-col items-center justify-center gap-1 text-[11px]",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
