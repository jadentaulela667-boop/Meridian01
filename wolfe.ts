import type {
  Candle,
  InstrumentId,
  OverlayLine,
  PatternPoint,
  Side,
  Timeframe,
  TradeSignal,
} from "@/lib/market/types";
import { clamp } from "./math";
import type { Swing } from "./swings";

function projectY(
  t1: number,
  y1: number,
  t2: number,
  y2: number,
  t: number,
): number {
  if (t2 === t1) return y2;
  const m = (y2 - y1) / (t2 - t1);
  return y1 + m * (t - t1);
}

function trendlineIntersect(
  a1: { time: number; price: number },
  a2: { time: number; price: number },
  b1: { time: number; price: number },
  b2: { time: number; price: number },
): { time: number; price: number } | null {
  const x1 = a1.time;
  const y1 = a1.price;
  const x2 = a2.time;
  const y2 = a2.price;
  const x3 = b1.time;
  const y3 = b1.price;
  const x4 = b2.time;
  const y4 = b2.price;
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-9) return null;
  const px =
    ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / den;
  const py =
    ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / den;
  if (px <= Math.max(x2, x4)) return null;
  return { time: px, price: py };
}

export function detectWolfe(
  candles: Candle[],
  swings: Swing[],
  instrumentId: InstrumentId,
  timeframe: Timeframe,
  atrValue: number,
): TradeSignal[] {
  if (swings.length < 5 || candles.length < 40) return [];
  const lastIndex = candles.length - 1;
  const lastCandle = candles[lastIndex]!;
  const found: TradeSignal[] = [];

  const start = Math.max(0, swings.length - 14);
  for (let i = start; i <= swings.length - 5; i++) {
    const p = swings.slice(i, i + 5) as [Swing, Swing, Swing, Swing, Swing];
    const [p1, p2, p3, p4, p5] = p;
    const lows = p1.kind === "low" && p3.kind === "low" && p5.kind === "low";
    const highs = p1.kind === "high" && p3.kind === "high" && p5.kind === "high";
    if (!lows && !highs) continue;
    if (p2.kind === p1.kind || p4.kind === p2.kind) continue;

    const bullish = lows;
    const side: Side = bullish ? "buy" : "sell";

    const channelOk = bullish
      ? p1.price > p3.price && p2.price > p4.price
      : p1.price < p3.price && p2.price < p4.price;
    if (!channelOk) continue;

    const projected5 = projectY(p1.time, p1.price, p3.time, p3.price, p5.time);
    const overshoot = bullish ? projected5 - p5.price : p5.price - projected5;
    if (overshoot < atrValue * 0.05) continue;

    const apex = trendlineIntersect(p1, p3, p2, p4);
    const epaPrice = projectY(p1.time, p1.price, p4.time, p4.price, lastCandle.time + (p5.time - p1.time) * 0.15);
    const barsSince5 = lastIndex - p5.index;
    if (barsSince5 > 20) continue;

    const entry = p5.price;
    const buffer = Math.max(atrValue * 0.3, Math.abs(p4.price - p5.price) * 0.12);
    const stop = bullish ? entry - buffer : entry + buffer;
    const t1 = epaPrice;
    const t2 = p1.price;
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(t1 - entry);
    if (risk <= 0 || reward / risk < 1.2) continue;
    if (bullish && t1 <= entry) continue;
    if (!bullish && t1 >= entry) continue;

    const price = lastCandle.close;
    const nearEntry = Math.abs(price - entry) <= atrValue * 1.2;
    const stillValid = bullish ? price >= stop : price <= stop;
    const status =
      barsSince5 <= 6 && nearEntry && stillValid
        ? "active"
        : barsSince5 <= 14 && stillValid
          ? "watch"
          : "expired";
    if (status === "expired") continue;

    const points: PatternPoint[] = p.map((swing, idx) => ({
      label: String(idx + 1),
      time: swing.time,
      price: swing.price,
      index: swing.index,
    }));

    const extendTo = Math.max(lastCandle.time, apex?.time ?? lastCandle.time);
    const lines: OverlayLine[] = [
      {
        id: "wolfe-path",
        role: "pattern",
        style: "solid",
        points: points.map((pt) => ({ time: pt.time, price: pt.price })),
      },
      {
        id: "wolfe-135",
        role: "trend",
        style: "dashed",
        points: [
          { time: p1.time, price: p1.price },
          { time: p3.time, price: p3.price },
          {
            time: extendTo,
            price: projectY(p1.time, p1.price, p3.time, p3.price, extendTo),
          },
        ],
      },
      {
        id: "wolfe-24",
        role: "trend",
        style: "dashed",
        points: [
          { time: p2.time, price: p2.price },
          { time: p4.time, price: p4.price },
          {
            time: extendTo,
            price: projectY(p2.time, p2.price, p4.time, p4.price, extendTo),
          },
        ],
      },
      {
        id: "wolfe-epa",
        role: "epa",
        style: "dashed",
        points: [
          { time: p1.time, price: p1.price },
          { time: p4.time, price: p4.price },
          { time: extendTo, price: projectY(p1.time, p1.price, p4.time, p4.price, extendTo) },
        ],
      },
    ];

    const symmetry =
      1 -
      Math.min(
        1,
        Math.abs(p3.time - p1.time - (p5.time - p3.time)) /
          Math.max(1, p5.time - p1.time),
      );
    const quality = Math.round(
      58 +
        clamp(overshoot / Math.max(atrValue, 1e-6), 0, 1) * 10 +
        symmetry * 10 +
        Math.min(8, (reward / risk) * 2) +
        (status === "active" ? 6 : 0),
    );

    found.push({
      id: `${instrumentId}-${timeframe}-wolfe-${p5.time}-${side}`,
      instrumentId,
      timeframe,
      side,
      strategy: "wolfe",
      patternName: `${bullish ? "Bullish" : "Bearish"} Wolfe Wave`,
      status,
      quality: Math.min(97, quality),
      entry,
      stop,
      targets: [t1, t2],
      rr: Number((reward / risk).toFixed(2)),
      formedAt: p5.time * 1000,
      notes: `5-wave Wolfe complete. Point 5 overshot the 1-3 line; EPA is the 1-4 projection.`,
      confluence: [
        "Point 5 entry",
        "EPA 1-4 line",
        apex ? "Channel converging" : "Channel intact",
      ],
      points,
      lines,
      levels: [
        { price: entry, label: "Entry", kind: "entry" },
        { price: stop, label: "Stop", kind: "stop" },
        { price: t1, label: "EPA", kind: "target" },
        { price: t2, label: "TP2", kind: "target" },
      ],
    });
  }

  return found
    .sort((a, b) => b.quality - a.quality || b.formedAt - a.formedAt)
    .slice(0, 2);
}
