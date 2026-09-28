import type { Candle } from "@/lib/market/types";

export function last<T>(items: T[]): T | undefined {
  return items[items.length - 1];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function trueRange(curr: Candle, prev: Candle): number {
  return Math.max(
    curr.high - curr.low,
    Math.abs(curr.high - prev.close),
    Math.abs(curr.low - prev.close),
  );
}

export function atr(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(trueRange(candles[i]!, candles[i - 1]!));
  }
  const slice = trs.slice(-period);
  if (!slice.length) return 0;
  return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}

export function ratio(a: number, b: number): number {
  if (!b) return 0;
  return a / b;
}

export function near(value: number, target: number, tolerance = 0.08): boolean {
  return Math.abs(value - target) <= tolerance;
}

export function inBand(
  value: number,
  min: number,
  max: number,
  pad = 0.05,
): boolean {
  return value >= min - pad && value <= max + pad;
}

export function closeness(value: number, target: number): number {
  if (!target) return 0;
  return 1 - Math.min(1, Math.abs(value - target) / Math.max(0.12, target * 0.35));
}

export function bandScore(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 1;
  const span = Math.max(0.04, max - min);
  const dist = value < min ? min - value : value - max;
  return clamp(1 - dist / span, 0, 1);
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function roundTo(value: number, decimals: number): number {
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
}
