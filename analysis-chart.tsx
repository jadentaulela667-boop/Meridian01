import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { INSTRUMENT_MAP } from "@/lib/market/symbols";
import type { ChartPayload, PriceLevel, TradeSignal } from "@/lib/market/types";
import { chartColors } from "@/lib/theme";

function levelColor(kind: PriceLevel["kind"]): string {
  if (kind === "support" || kind === "target") return chartColors.support;
  if (kind === "resistance" || kind === "stop") return chartColors.resistance;
  if (kind === "entry") return chartColors.entry;
  return chartColors.pivot;
}

export function AnalysisChart({
  chart,
  signal,
}: {
  chart: ChartPayload;
  signal: TradeSignal | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const api = useRef<{
    chart: IChartApi;
    candles: ISeriesApi<"Candlestick">;
    lines: ISeriesApi<"Line">[];
    priceLines: IPriceLine[];
    markers: ISeriesMarkersPluginApi<Time>;
  } | null>(null);
  const [ready, setReady] = useState(0);
  const decimals = INSTRUMENT_MAP[chart.instrumentId].decimals;
  const minMove = 10 ** -decimals;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const instance = createChart(el, {
      width: Math.max(el.clientWidth, 1),
      height: Math.max(el.clientHeight, 1),
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.text,
        fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: chartColors.grid },
        horzLines: { color: chartColors.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: chartColors.crosshair, width: 1, style: LineStyle.SparseDotted },
        horzLine: { color: chartColors.crosshair, width: 1, style: LineStyle.SparseDotted },
      },
      rightPriceScale: {
        borderColor: chartColors.border,
        scaleMargins: { top: 0.08, bottom: 0.12 },
      },
      timeScale: {
        borderColor: chartColors.border,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale: { axisPressedMouseMove: true, pinch: true, mouseWheel: true },
    });
    const candles = instance.addSeries(CandlestickSeries, {
      upColor: chartColors.up,
      downColor: chartColors.down,
      wickUpColor: chartColors.up,
      wickDownColor: chartColors.down,
      borderVisible: false,
      priceFormat: { type: "price", precision: decimals, minMove },
    });
    api.current = {
      chart: instance,
      candles,
      lines: [],
      priceLines: [],
      markers: createSeriesMarkers(candles, []),
    };
    setReady((value) => value + 1);
    return () => {
      instance.remove();
      api.current = null;
    };
  }, [decimals, minMove]);

  useEffect(() => {
    const current = api.current;
    if (!current || !ready) return;
    const bars = chart.candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    current.candles.setData(bars);

    for (const line of current.lines) current.chart.removeSeries(line);
    for (const priceLine of current.priceLines) current.candles.removePriceLine(priceLine);
    current.lines = [];
    current.priceLines = [];

    const overlay = signal;
    for (const src of overlay?.lines ?? []) {
      const series = current.chart.addSeries(LineSeries, {
        color:
          src.role === "epa"
            ? chartColors.epa
            : src.role === "trend"
              ? chartColors.wolfe
              : overlay?.strategy === "wolfe"
                ? chartColors.wolfe
                : chartColors.harmonic,
        lineWidth: src.role === "pattern" ? 2 : 1,
        lineStyle: src.style === "dashed" ? LineStyle.Dashed : LineStyle.Solid,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      const points = src.points
        .map((point) => ({
          time: Math.round(point.time) as UTCTimestamp,
          value: point.price,
        }))
        .filter((point, i, arr) => i === 0 || point.time > arr[i - 1]!.time);
      if (points.length >= 2) series.setData(points);
      current.lines.push(series);
    }

    const levels = overlay?.levels?.length ? overlay.levels : chart.levels.slice(0, 6);
    for (const level of levels) {
      current.priceLines.push(
        current.candles.createPriceLine({
          price: level.price,
          color: levelColor(level.kind),
          lineWidth: level.kind === "entry" ? 2 : 1,
          lineStyle:
            level.kind === "entry" || level.kind === "stop" || level.kind === "target"
              ? LineStyle.Dashed
              : LineStyle.SparseDotted,
          axisLabelVisible: true,
          title: level.label,
        }),
      );
    }

    const markers: SeriesMarker<Time>[] = [];
    if (overlay) {
      for (const point of overlay.points) {
        markers.push({
          time: point.time as UTCTimestamp,
          position: overlay.side === "buy" ? "belowBar" : "aboveBar",
          color: chartColors.harmonic,
          shape: "circle",
          text: point.label,
        });
      }
      const lastPoint = overlay.points[overlay.points.length - 1];
      markers.push({
        time: (lastPoint?.time ?? chart.candles[chart.candles.length - 1]?.time ?? 0) as UTCTimestamp,
        position: overlay.side === "buy" ? "belowBar" : "aboveBar",
        color: overlay.side === "buy" ? chartColors.up : chartColors.down,
        shape: overlay.side === "buy" ? "arrowUp" : "arrowDown",
        text: "ENTRY",
      });
    }
    current.markers.setMarkers(markers);
    current.chart.timeScale().fitContent();
  }, [chart, signal, ready]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
