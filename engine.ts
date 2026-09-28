import type {
  Candle,
  ChartPayload,
  InstrumentId,
  Quote,
  ScanPayload,
  Timeframe,
  TradeSignal,
} from "@/lib/market/types";
import { detectHarmonics } from "./harmonics";
import { atr } from "./math";
import { detectLevels, detectSrSignals, nearestLevel } from "./support-resistance";
import { findSwings } from "./swings";
import { detectWolfe } from "./wolfe";

const LEFT: Record<Timeframe, number> = { "15m": 5, "30m": 4, "1h": 4 };
const RIGHT: Record<Timeframe, number> = { "15m": 3, "30m": 3, "1h": 2 };

export function analyzeChart(
  instrumentId: InstrumentId,
  timeframe: Timeframe,
  candles: Candle[],
  quote: Quote,
): ChartPayload {
  const atrValue = atr(candles, 14);
  const swings = findSwings(candles, LEFT[timeframe], RIGHT[timeframe]);
  const levels = detectLevels(candles, swings, atrValue);
  const harmonics = detectHarmonics(candles, swings, instrumentId, timeframe, atrValue);
  const wolfe = detectWolfe(candles, swings, instrumentId, timeframe, atrValue);
  const sr = detectSrSignals(candles, swings, levels, instrumentId, timeframe, atrValue);

  const signals = [...harmonics, ...wolfe, ...sr].map((signal) => {
    const magnet = nearestLevel(levels, signal.entry, atrValue);
    if (!magnet) return signal;
    const confluence = signal.confluence.includes(magnet.label)
      ? signal.confluence
      : [...signal.confluence, `${magnet.label} confluence`];
    return {
      ...signal,
      quality: Math.min(99, signal.quality + 6),
      confluence,
    };
  });

  return {
    instrumentId,
    timeframe,
    candles,
    quote,
    signals: signals.sort((a, b) => b.quality - a.quality),
    levels,
    atr: atrValue,
  };
}

export function applyMultiTimeframeConfluence(signals: TradeSignal[]): TradeSignal[] {
  const byKey = new Map<string, TradeSignal[]>();
  for (const signal of signals) {
    const key = `${signal.instrumentId}-${signal.side}`;
    const list = byKey.get(key) ?? [];
    list.push(signal);
    byKey.set(key, list);
  }
  return signals.map((signal) => {
    const peers = byKey.get(`${signal.instrumentId}-${signal.side}`) ?? [];
    const tfs = new Set(peers.map((item) => item.timeframe));
    if (tfs.size < 2) return signal;
    return {
      ...signal,
      quality: Math.min(99, signal.quality + 5 * (tfs.size - 1)),
      confluence: [
        ...signal.confluence,
        `Aligned on ${[...tfs].join(" + ")}`,
      ],
    };
  });
}

export function buildScan(charts: ChartPayload[]): ScanPayload {
  const quotes = charts
    .filter((chart) => chart.timeframe === "15m")
    .map((chart) => chart.quote);
  const signals = applyMultiTimeframeConfluence(
    charts.flatMap((chart) => chart.signals),
  ).sort((a, b) => {
    const statusRank = { active: 0, watch: 1, expired: 2 };
    return statusRank[a.status] - statusRank[b.status] || b.quality - a.quality;
  });
  return {
    generatedAt: Date.now(),
    quotes,
    signals,
    charts,
  };
}
