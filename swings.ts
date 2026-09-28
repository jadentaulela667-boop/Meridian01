import type { Candle } from "@/lib/market/types";
import { atr } from "./math";

export type Swing = {
  index: number;
  time: number;
  price: number;
  kind: "high" | "low";
};

function moreExtreme(a: Swing, b: Swing): Swing {
  if (a.kind !== b.kind) return b;
  if (a.kind === "high") return a.price >= b.price ? a : b;
  return a.price <= b.price ? a : b;
}

export function findSwings(
  candles: Candle[],
  left = 5,
  right = 3,
): Swing[] {
  if (candles.length < left + right + 3) return [];
  const raw: Swing[] = [];
  for (let i = left; i < candles.length - right; i++) {
    const bar = candles[i]!;
    let isHigh = true;
    let isLow = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      const other = candles[j]!;
      if (other.high > bar.high) isHigh = false;
      if (other.low < bar.low) isLow = false;
    }
    if (isHigh) {
      raw.push({ index: i, time: bar.time, price: bar.high, kind: "high" });
    } else if (isLow) {
      raw.push({ index: i, time: bar.time, price: bar.low, kind: "low" });
    }
  }

  const alternating: Swing[] = [];
  for (const swing of raw) {
    const prev = alternating[alternating.length - 1];
    if (!prev) {
      alternating.push(swing);
      continue;
    }
    if (prev.kind === swing.kind) {
      alternating[alternating.length - 1] = moreExtreme(prev, swing);
    } else {
      alternating.push(swing);
    }
  }

  const range = atr(candles, 14);
  const lastClose = candles[candles.length - 1]?.close ?? 0;
  const minSize = Math.max(range * 0.45, lastClose * 0.0006);
  const filtered: Swing[] = [];
  for (const swing of alternating) {
    const prev = filtered[filtered.length - 1];
    if (!prev) {
      filtered.push(swing);
      continue;
    }
    if (Math.abs(swing.price - prev.price) < minSize) {
      filtered[filtered.length - 1] = moreExtreme(prev, swing);
      continue;
    }
    filtered.push(swing);
  }
  return filtered;
}

export function swingAt(swings: Swing[], offsetFromEnd: number): Swing | undefined {
  return swings[swings.length - 1 - offsetFromEnd];
}
