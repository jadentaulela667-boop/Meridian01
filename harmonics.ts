import type { Candle, OverlayLine, PatternPoint, Side, TradeSignal } from "@/lib/market/types";
import type { InstrumentId, Timeframe } from "@/lib/market/types";
import { bandScore, closeness, inBand, near, ratio } from "./math";
import type { Swing } from "./swings";

type HarmonicKind =
  | "Gartley"
  | "Bat"
  | "Butterfly"
  | "Crab"
  | "Cypher"
  | "Shark";

type RatioSet = {
  abxa: number;
  bcab: number;
  cdbc: number;
  adxa: number;
  dcxc: number;
};

function ratiosOf(x: Swing, a: Swing, b: Swing, c: Swing, d: Swing): RatioSet {
  const xa = Math.abs(a.price - x.price);
  const ab = Math.abs(b.price - a.price);
  const bc = Math.abs(c.price - b.price);
  const cd = Math.abs(d.price - c.price);
  const ad = Math.abs(d.price - a.price);
  const xc = Math.abs(c.price - x.price);
  return {
    abxa: ratio(ab, xa),
    bcab: ratio(bc, ab),
    cdbc: ratio(cd, bc),
    adxa: ratio(ad, xa),
    dcxc: ratio(Math.abs(d.price - c.price), xc) || ratio(cd, xc),
  };
}

function matchPattern(r: RatioSet): { kind: HarmonicKind; score: number } | null {
  const candidates: { kind: HarmonicKind; score: number }[] = [];

  if (near(r.abxa, 0.618, 0.09) && inBand(r.bcab, 0.382, 0.886) && near(r.adxa, 0.786, 0.1)) {
    candidates.push({
      kind: "Gartley",
      score:
        0.42 * closeness(r.abxa, 0.618) +
        0.2 * bandScore(r.bcab, 0.382, 0.886) +
        0.38 * closeness(r.adxa, 0.786),
    });
  }

  if (inBand(r.abxa, 0.382, 0.5, 0.07) && inBand(r.bcab, 0.382, 0.886) && near(r.adxa, 0.886, 0.1)) {
    candidates.push({
      kind: "Bat",
      score:
        0.3 * bandScore(r.abxa, 0.382, 0.5) +
        0.2 * bandScore(r.bcab, 0.382, 0.886) +
        0.5 * closeness(r.adxa, 0.886),
    });
  }

  if (near(r.abxa, 0.786, 0.1) && inBand(r.adxa, 1.27, 1.618, 0.08)) {
    candidates.push({
      kind: "Butterfly",
      score:
        0.35 * closeness(r.abxa, 0.786) +
        0.25 * bandScore(r.bcab, 0.382, 0.886) +
        0.4 * bandScore(r.adxa, 1.27, 1.618),
    });
  }

  if (inBand(r.abxa, 0.382, 0.618) && near(r.adxa, 1.618, 0.12) && inBand(r.cdbc, 2.0, 3.618, 0.2)) {
    candidates.push({
      kind: "Crab",
      score:
        0.25 * bandScore(r.abxa, 0.382, 0.618) +
        0.45 * closeness(r.adxa, 1.618) +
        0.3 * bandScore(r.cdbc, 2.24, 3.618),
    });
  }

  if (
    inBand(r.abxa, 0.382, 0.618) &&
    inBand(r.bcab, 1.13, 1.414, 0.12) &&
    near(r.dcxc, 0.786, 0.1)
  ) {
    candidates.push({
      kind: "Cypher",
      score:
        0.25 * bandScore(r.abxa, 0.382, 0.618) +
        0.35 * bandScore(r.bcab, 1.13, 1.414) +
        0.4 * closeness(r.dcxc, 0.786),
    });
  }

  if (
    inBand(r.abxa, 0.382, 0.618) &&
    inBand(r.bcab, 1.13, 1.618, 0.12) &&
    inBand(r.dcxc, 0.886, 1.13, 0.1)
  ) {
    candidates.push({
      kind: "Shark",
      score:
        0.3 * bandScore(r.abxa, 0.382, 0.618) +
        0.3 * bandScore(r.bcab, 1.13, 1.618) +
        0.4 * bandScore(r.dcxc, 0.886, 1.13),
    });
  }

  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.score - a.score)[0] ?? null;
}

function structureValid(x: Swing, a: Swing, b: Swing, c: Swing, d: Swing): boolean {
  if (x.kind === d.kind && x.kind !== a.kind && a.kind === c.kind && b.kind === d.kind) {
    return true;
  }
  return false;
}

export function detectHarmonics(
  candles: Candle[],
  swings: Swing[],
  instrumentId: InstrumentId,
  timeframe: Timeframe,
  atrValue: number,
): TradeSignal[] {
  if (swings.length < 5 || candles.length < 30) return [];
  const lastIndex = candles.length - 1;
  const lastCandle = candles[lastIndex]!;
  const found: TradeSignal[] = [];

  const start = Math.max(0, swings.length - 16);
  for (let i = start; i <= swings.length - 5; i++) {
    const x = swings[i]!;
    const a = swings[i + 1]!;
    const b = swings[i + 2]!;
    const c = swings[i + 3]!;
    const d = swings[i + 4]!;
    if (!structureValid(x, a, b, c, d)) continue;

    const r = ratiosOf(x, a, b, c, d);
    const matched = matchPattern(r);
    if (!matched || matched.score < 0.58) continue;

    const bullish = d.kind === "low";
    const side: Side = bullish ? "buy" : "sell";
    const barsSinceD = lastIndex - d.index;
    if (barsSinceD > 28) continue;

    const entry = d.price;
    const beyondX = bullish ? Math.min(x.price, d.price) : Math.max(x.price, d.price);
    const buffer = Math.max(atrValue * 0.28, Math.abs(a.price - x.price) * 0.08);
    const stop = bullish ? beyondX - buffer : beyondX + buffer;
    const cd = Math.abs(d.price - c.price);
    const t1 = bullish ? entry + cd * 0.382 : entry - cd * 0.382;
    const t2 = bullish ? entry + cd * 0.618 : entry - cd * 0.618;
    const t3 = a.price;
    const risk = Math.abs(entry - stop);
    if (risk <= 0) continue;
    const reward = Math.abs(t1 - entry);
    const rr = reward / risk;
    if (rr < 1.15) continue;

    const price = lastCandle.close;
    const nearEntry = Math.abs(price - entry) <= atrValue * 1.15;
    const stillValid = bullish ? price >= stop && price <= c.price : price <= stop && price >= c.price;
    const status =
      barsSinceD <= 8 && nearEntry && stillValid
        ? "active"
        : barsSinceD <= 18 && stillValid
          ? "watch"
          : "expired";
    if (status === "expired") continue;

    const points: PatternPoint[] = [
      { label: "X", time: x.time, price: x.price, index: x.index },
      { label: "A", time: a.time, price: a.price, index: a.index },
      { label: "B", time: b.time, price: b.price, index: b.index },
      { label: "C", time: c.time, price: c.price, index: c.index },
      { label: "D", time: d.time, price: d.price, index: d.index },
    ];
    const lines: OverlayLine[] = [
      {
        id: "xad",
        role: "pattern",
        style: "solid",
        points: points.map((p) => ({ time: p.time, price: p.price })),
      },
    ];

    const quality = Math.round(
      55 +
        matched.score * 28 +
        Math.min(8, rr * 2) +
        (status === "active" ? 6 : 0) +
        (nearEntry ? 4 : 0),
    );

    found.push({
      id: `${instrumentId}-${timeframe}-harmonic-${matched.kind}-${d.time}-${side}`,
      instrumentId,
      timeframe,
      side,
      strategy: "harmonic",
      patternName: `${bullish ? "Bullish" : "Bearish"} ${matched.kind}`,
      status,
      quality: Math.min(98, quality),
      entry,
      stop,
      targets: [t1, t2, t3],
      rr: Number(rr.toFixed(2)),
      formedAt: d.time * 1000,
      notes: `XABCD ${matched.kind} complete at D. AB/XA ${r.abxa.toFixed(3)}, AD/XA ${r.adxa.toFixed(3)}.`,
      confluence: [
        `PRZ at D`,
        `RR ${rr.toFixed(1)} to TP1`,
        status === "active" ? "Price still in zone" : "Watching reaction",
      ],
      points,
      lines,
      levels: [
        { price: entry, label: "Entry", kind: "entry" },
        { price: stop, label: "Stop", kind: "stop" },
        { price: t1, label: "TP1", kind: "target" },
        { price: t2, label: "TP2", kind: "target" },
        { price: t3, label: "TP3", kind: "target" },
      ],
    });
  }

  return found
    .sort((a, b) => b.quality - a.quality || b.formedAt - a.formedAt)
    .slice(0, 3);
}
