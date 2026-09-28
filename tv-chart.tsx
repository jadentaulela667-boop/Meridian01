import { useEffect, useId, useState } from "react";

function nestedFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function LiveTvChart({
  symbol,
  interval,
}: {
  symbol: string;
  interval: string;
}) {
  const reactId = useId().replace(/:/g, "");
  const [blocked, setBlocked] = useState(nestedFrame());
  const src = `https://www.tradingview.com/widgetembed/?frameElementId=tv${reactId}&symbol=${encodeURIComponent(symbol)}&interval=${interval}&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=09090b&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1&locale=en&hidetoptoolbar=0&backgroundColor=%2309090b`;

  useEffect(() => {
    if (nestedFrame()) setBlocked(true);
  }, []);

  if (blocked) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        TradingView live embed is blocked in this view. Use Setups for the live
        Yahoo feed with entry and exit levels drawn on the chart.
      </div>
    );
  }

  return (
    <iframe
      title="Live market chart"
      src={src}
      className="h-full min-h-[240px] w-full border-0"
      referrerPolicy="no-referrer-when-downgrade"
      onError={() => setBlocked(true)}
    />
  );
}
