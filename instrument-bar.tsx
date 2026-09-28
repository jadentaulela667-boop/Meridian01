import { INSTRUMENTS, formatPrice } from "@/lib/market/symbols";
import type { Quote } from "@/lib/market/types";
import { useDeskStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function InstrumentBar({ quotes }: { quotes: Quote[] }) {
  const instrumentId = useDeskStore((s) => s.instrumentId);
  const setInstrument = useDeskStore((s) => s.setInstrument);
  const quoteMap = new Map(quotes.map((q) => [q.instrumentId, q]));

  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-4">
      {INSTRUMENTS.map((item) => {
        const quote = quoteMap.get(item.id);
        const active = instrumentId === item.id;
        const up = (quote?.changePct ?? 0) >= 0;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setInstrument(item.id)}
            className={cn(
              "min-w-[132px] shrink-0 rounded-lg border px-3 py-2.5 text-left transition-[border-color,background-color] duration-150",
              active ? "border-accent/50 bg-muted" : "border-border bg-card hover:border-accent/30",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium tracking-wide">{item.label}</span>
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  up ? "text-buy" : "text-sell",
                )}
              >
                {quote
                  ? `${up ? "+" : ""}${quote.changePct.toFixed(2)}%`
                  : "—"}
              </span>
            </div>
            <p className="mt-1 font-mono text-sm tabular-nums">
              {quote ? formatPrice(item.id, quote.price) : "Scanning"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
