import { useQuery } from "@tanstack/react-query";
import { getChartData, getMarketScan } from "@/lib/market/functions";
import type { InstrumentId, Timeframe } from "@/lib/market/types";

export function useChartData(instrumentId: InstrumentId, timeframe: Timeframe) {
  return useQuery({
    queryKey: ["chart", instrumentId, timeframe],
    queryFn: () => getChartData({ data: { instrumentId, timeframe } }),
    refetchInterval: 30_000,
  });
}

export function useMarketScan() {
  return useQuery({
    queryKey: ["scan"],
    queryFn: () => getMarketScan(),
    refetchInterval: 90_000,
    staleTime: 20_000,
  });
}
