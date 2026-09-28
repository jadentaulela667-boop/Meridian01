import type {
  Candle,
  InstrumentId,
  PriceLevel,
  Timeframe,
  TradeSignal,
} from "@/lib/market/types";
import { last } from "./math";
import type { Swing } from "./swings";

function clusterLevels(prices: number[], tolerance: number): { price: number; touches: number }[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const clusters: { sum: number; count: number }[] = [];
  for (const price of sorted) {
    const current = clusters[clusters.length - 1];
    if (current && Math.abs(price - current.sum / current.count) <= tolerance) {
      current.sum += price;
      current.count += 1;
    } else {
      clusters.push({ sum: price, count: 1 });
    }
  }
  return clusters
    .map((c) => ({ price: c.sum / c.count, touches: c.count }))
    .filter((c) => c.touches >= 2)
    .sort((a, b) => b.touches - a.touches);
}

export function detectLevels(
  candles: Candle[],
  swings: Swing[],
  atrValue: number,
): PriceLevel[] {
  if (!candles.length) return [];
  const lastClose = last(candles)!.close;
  const tolerance = Math.max(atrValue * 0.35, lastClose * 0.0007);
  const clustered = clusterLevels(
    swings.map((s) => s.price),
    tolerance,
  );

  const dayMs = 24 * 60 * 60;
  const lastTime = last(candles)!.time;
  const prior = candles.filter((c) => c.time < lastTime - dayMs * 0.4);
  const session = prior.length ? prior.slice(-48) : candles.slice(0, Math.max(8, candles.length - 8));
  let hi = -Infinity;
  let lo = Infinity;
  let close = session[session.length - 1]?.close ?? lastClose;
  for (const c of session) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
    close = c.close;
  }
  const pp = (hi + lo + close) / 3;
  const r1 = 2 * pp - lo;
  const s1 = 2 * pp - hi;
  const r2 = pp + (hi - lo);
  const s2 = pp - (hi - lo);

  const levels: PriceLevel[] = [
    { price: pp, label: "Pivot", kind: "pivot" },
    { price: r1, label: "R1", kind: "resistance" },
    { price: r2, label: "R2", kind: "resistance" },
    { price: s1, label: "S1", kind: "support" },
    { price: s2, label: "S2", kind: "support" },
  ];

  for (const cluster of clustered.slice(0, 8)) {
    const kind = cluster.price >= lastClose ? "resistance" : "support";
    levels.push({
      price: cluster.price,
      label: `${kind === "support" ? "S" : "R"} ${cluster.touches}x`,
      kind,
    });
  }
  return levels;
}

export function detectSrSignals(
  candles: Candle[],
  swings: Swing[],
  levels: PriceLevel[],
  instrumentId: InstrumentId,
  timeframe: Timeframe,
  atrValue: number,
): TradeSignal[] {
  if (candles.length < 20) return [];
  const lastBar = last(candles)!;
  const prev = candles[candles.length - 2];
  if (!prev) return [];
  const found: TradeSignal[] = [];
  const unique = levels.filter(
    (level) => level.kind === "support" || level.kind === "resistance",
  );

  for (const level of unique.slice(0, 10)) {
    const dist = Math.abs(lastBar.close - level.price);
    if (dist > atrValue * 1.4) continue;

    const wickLow = Math.min(lastBar.open, lastBar.close) - lastBar.low;
    const wickHigh = lastBar.high - Math.max(lastBar.open, lastBar.close);
    const body = Math.abs(lastBar.close - lastBar.open);
    const bullishPin =
      level.kind === "support" &&
      lastBar.low <= level.price + atrValue * 0.15 &&
      lastBar.close > level.price &&
      wickLow > body * 0.9;
    const bearishPin =
      level.kind === "resistance" &&
      lastBar.high >= level.price - atrValue * 0.15 &&
      lastBar.close < level.price &&
      wickHigh > body * 0.9;
    const bullEngulf =
      level.kind === "support" &&
      lastBar.close > lastBar.open &&
      prev.close < prev.open &&
      lastBar.close >= prev.open &&
      lastBar.low <= level.price + atrValue * 0.25;
    const bearEngulf =
      level.kind === "resistance" &&
      lastBar.close < lastBar.open &&
      prev.close > prev.open &&
      lastBar.close <= prev.open &&
      lastBar.high >= level.price - atrValue * 0.25;

    const buy = bullishPin || bullEngulf;
    const sell = bearishPin || bearEngulf;
    if (!buy && !sell) continue;

    const side = buy ? "buy" : "sell";
    const entry = lastBar.close;
    const buffer = atrValue * 0.35;
    const stop = buy ? Math.min(lastBar.low, level.price) - buffer : Math.max(lastBar.high, level.price) + buffer;
    const risk = Math.abs(entry - stop);
    if (risk <= 0) continue;
    const t1 = buy ? entry + risk * 1.6 : entry - risk * 1.6;
    const t2 = buy ? entry + risk * 2.4 : entry - risk * 2.4;
    const rr = Math.abs(t1 - entry) / risk;
    const reaction = bullishPin || bearishPin ? "pin bar" : "engulfing";
    const quality = Math.round(
      62 +
        (reaction === "pin bar" ? 8 : 6) +
        Math.min(10, rr * 3) +
        (dist < atrValue * 0.35 ? 6 : 2),
    );

    found.push({
      id: `${instrumentId}-${timeframe}-sr-${level.label}-${lastBar.time}-${side}`,
      instrumentId,
      timeframe,
      side,
      strategy: "sr",
      patternName: `${buy ? "Support bounce" : "Resistance rejection"}`,
      status: "active",
      quality: Math.min(94, quality),
      entry,
      stop,
      targets: [t1, t2],
      rr: Number(rr.toFixed(2)),
      formedAt: lastBar.time * 1000,
      notes: `${reaction} at ${level.label}. Price respected the level and closed back ${buy ? "above" : "below"} it.`,
      confluence: [level.label, reaction, `RR ${rr.toFixed(1)}`],
      points: [
        {
          label: buy ? "S" : "R",
          time: lastBar.time,
          price: level.price,
          index: candles.length - 1,
        },
      ],
      lines: [],
      levels: [
        { price: level.price, label: level.label, kind: level.kind },
        { price: entry, label: "Entry", kind: "entry" },
        { price: stop, label: "Stop", kind: "stop" },
        { price: t1, label: "TP1", kind: "target" },
        { price: t2, label: "TP2", kind: "target" },
      ],
    });
  }

  return found.sort((a, b) => b.quality - a.quality).slice(0, 2);
}

export function nearestLevel(
  levels: PriceLevel[],
  price: number,
  atrValue: number,
): PriceLevel | undefined {
  return levels
    .filter((level) => level.kind === "support" || level.kind === "resistance")
    .map((level) => ({ level, dist: Math.abs(level.price - price) }))
    .filter((item) => item.dist <= atrValue * 0.8)
    .sort((a, b) => a.dist - b.dist)[0]?.level;
}
