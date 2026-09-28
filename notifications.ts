import type { TradeSignal } from "@/lib/market/types";
import { formatPrice, INSTRUMENT_MAP } from "@/lib/market/symbols";

export function playPing() {
  if (typeof window === "undefined") return;
  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = 740;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
  void ctx.resume();
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function pushDesktopAlert(signal: TradeSignal) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const meta = INSTRUMENT_MAP[signal.instrumentId];
  const title = `${signal.side === "buy" ? "BUY" : "SELL"} ${meta.label} · ${signal.patternName}`;
  const body = `${signal.timeframe}  ·  entry ${formatPrice(signal.instrumentId, signal.entry)}  ·  quality ${signal.quality}`;
  try {
    new Notification(title, { body, silent: true });
  } catch {
    // Preview iframes often block Notification constructors.
  }
}
