import { formatDistanceToNow } from "date-fns";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatPrice } from "@/lib/market/symbols";
import type { TradeSignal } from "@/lib/market/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SignalCard({
  signal,
  active,
  onSelect,
}: {
  signal: TradeSignal;
  active?: boolean;
  onSelect?: () => void;
}) {
  const buy = signal.side === "buy";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border bg-card p-3 text-left transition-[border-color,background-color] duration-150",
        active ? "border-accent/50 bg-muted" : "border-border hover:border-accent/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium tracking-tight">{signal.instrumentId}</span>
            <span className="font-mono text-xs text-muted-foreground">{signal.timeframe}</span>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{signal.patternName}</p>
        </div>
        <Badge variant={buy ? "buy" : "sell"}>
          {buy ? <ArrowUpRight className="mr-1 size-3" /> : <ArrowDownRight className="mr-1 size-3" />}
          {buy ? "BUY" : "SELL"}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs tabular-nums">
        <Metric label="Entry" value={formatPrice(signal.instrumentId, signal.entry)} />
        <Metric label="Stop" value={formatPrice(signal.instrumentId, signal.stop)} />
        <Metric label="TP1" value={formatPrice(signal.instrumentId, signal.targets[0] ?? signal.entry)} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full", buy ? "bg-buy" : "bg-sell")}
            style={{ width: `${Math.min(100, signal.quality)}%` }}
          />
        </div>
        <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
          Q{signal.quality} · {signal.rr.toFixed(1)}R · {signal.status} ·{" "}
          {formatDistanceToNow(signal.formedAt, { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-foreground">{value}</p>
    </div>
  );
}
