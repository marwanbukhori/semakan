import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useElementWidth } from '@/shared/hooks/useElementWidth';
import { formatDate, formatMonthYear, formatPrice } from '@/shared/lib/format';
import {
  layoutEndLabels,
  linearScale,
  monthTickIndexes,
  nearestIndex,
  niceDomain,
  segmentPath,
  ticks,
} from '../chart/geometry';
import type { FuelKey, LevelRow } from '../types';

const HEIGHT = 300;
const LABEL_GAP = 16;
const DIRECT_LABEL_MIN_WIDTH = 480;

type FuelPriceChartProps = {
  levels: readonly LevelRow[];
  fuels: readonly FuelKey[];
  rangeLabel: string;
};

export function FuelPriceChart({ levels, fuels, rangeLabel }: FuelPriceChartProps) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = useElementWidth(containerRef, 720);
  const [active, setActive] = useState<number | null>(null);
  const instructionsId = useId();
  const summaryId = useId();

  const showDirectLabels = width >= DIRECT_LABEL_MIN_WIDTH;
  const margin = { top: 16, right: showDirectLabels ? 136 : 16, bottom: 32, left: 48 };
  const lang = i18n.language;
  const price = (value: number) => t('fuel.price', { value: formatPrice(value, lang) });

  const geometry = useMemo(() => {
    const plotRight = width - margin.right;
    const plotBottom = HEIGHT - margin.bottom;
    const values = levels.flatMap((row) =>
      fuels.flatMap((fuel) => (row[fuel] === null ? [] : [row[fuel]])),
    );
    const domain = niceDomain(values);
    const x = linearScale([0, Math.max(levels.length - 1, 1)], [margin.left, plotRight]);
    const y = linearScale(domain, [plotBottom, margin.top]);
    const xs = levels.map((_, i) => x(i));
    const series = fuels.map((fuel) => {
      const points = levels.map((row, i) =>
        row[fuel] === null ? null : { x: xs[i]!, y: y(row[fuel]) },
      );
      const lastIndex = levels.findLastIndex((row) => row[fuel] !== null);
      return { fuel, points, lastIndex };
    });
    const labelY = layoutEndLabels(
      series.flatMap((s) =>
        s.lastIndex < 0 ? [] : [{ key: s.fuel, y: s.points[s.lastIndex]!.y }],
      ),
      LABEL_GAP,
      [margin.top, plotBottom],
    );
    const maxTicks = Math.max(1, Math.floor((plotRight - margin.left) / 72));
    return {
      plotRight,
      plotBottom,
      domain,
      y,
      xs,
      series,
      labelY,
      monthTicks: monthTickIndexes(
        levels.map((r) => r.date),
        maxTicks,
      ),
    };
  }, [width, levels, fuels, margin.left, margin.right, margin.top, margin.bottom]);

  const activeRow = active === null ? undefined : levels[active];
  const readout = activeRow
    ? [
        formatDate(activeRow.date, lang),
        ...fuels
          .filter((fuel) => activeRow[fuel] !== null)
          .sort((a, b) => (activeRow[b] ?? 0) - (activeRow[a] ?? 0))
          .map((fuel) => `${t(`fuel.series.${fuel}`)} ${price(activeRow[fuel] ?? 0)}`),
      ].join(', ')
    : '';

  const summary = fuels
    .flatMap((fuel) => {
      const values = levels.flatMap((row) => (row[fuel] === null ? [] : [row[fuel]]));
      const first = values[0];
      const lastValue = values.at(-1);
      return first === undefined || lastValue === undefined
        ? []
        : [
            t('fuel.chart.summary', {
              fuel: t(`fuel.series.${fuel}`),
              from: formatPrice(first, lang),
              to: formatPrice(lastValue, lang),
            }),
          ];
    })
    .join(' ');

  function onPointerMove(event: PointerEvent<SVGRectElement>) {
    const left = svgRef.current?.getBoundingClientRect().left ?? 0;
    const index = nearestIndex(geometry.xs, event.clientX - left);
    setActive(index < 0 ? null : index);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const lastIndex = levels.length - 1;
    const current = active ?? lastIndex;
    const next =
      event.key === 'ArrowLeft'
        ? Math.max(0, current - 1)
        : event.key === 'ArrowRight'
          ? Math.min(lastIndex, current + 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? lastIndex
              : undefined;
    if (event.key === 'Escape') {
      setActive(null);
      return;
    }
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
  }

  const activeX = active === null ? undefined : geometry.xs[active];
  const tooltipOnLeft = activeX !== undefined && activeX > width - 200;

  // A keyboard-explorable chart: one tab stop, named and described (instructions plus a text
  // summary), with the arrow keys reading each week into a live region. `group` keeps that name
  // and description; `application` would take the screen reader's own reading keys away.
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above
    <div
      ref={containerRef}
      role="group"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above
      tabIndex={0}
      aria-label={t('fuel.chart.label', { range: rangeLabel })}
      aria-describedby={`${instructionsId} ${summaryId}`}
      onKeyDown={onKeyDown}
      onFocus={() => setActive((current) => current ?? levels.length - 1)}
      onBlur={() => setActive(null)}
      className="fuel-chart relative rounded-md focus-visible:outline-none focus-visible:ring focus-visible:ring-fr-primary"
    >
      <p id={instructionsId} className="sr-only">
        {t('fuel.chart.instructions')}
      </p>
      <p id={summaryId} className="sr-only">
        {summary}
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {readout}
      </p>

      <svg
        ref={svgRef}
        width={width}
        height={HEIGHT}
        aria-hidden="true"
        className="block max-w-full"
      >
        {ticks(geometry.domain).map((value) => (
          <g key={value}>
            <line
              x1={margin.left}
              x2={geometry.plotRight}
              y1={geometry.y(value)}
              y2={geometry.y(value)}
              className="stroke-otl-divider"
              strokeWidth={1}
            />
            <text
              x={margin.left - 8}
              y={geometry.y(value)}
              dy="0.32em"
              textAnchor="end"
              className="fill-txt-black-500 text-body-xs"
            >
              {formatPrice(value, lang)}
            </text>
          </g>
        ))}
        {geometry.monthTicks.map((index) => (
          <text
            key={index}
            x={geometry.xs[index]}
            y={HEIGHT - 10}
            textAnchor="middle"
            className="fill-txt-black-500 text-body-xs"
          >
            {formatMonthYear(levels[index]!.date, lang)}
          </text>
        ))}

        {geometry.series.map(({ fuel, points }) => (
          <path
            key={fuel}
            data-fuel={fuel}
            d={segmentPath(points)}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ stroke: `var(--fuel-${fuel})` }}
          />
        ))}

        {geometry.series.map(({ fuel, points, lastIndex }) => {
          const end = lastIndex < 0 ? null : points[lastIndex];
          if (!end) return null;
          const labelY = geometry.labelY[fuel] ?? end.y;
          const value = levels[lastIndex]![fuel] ?? 0;
          return (
            <g key={`end-${fuel}`}>
              <circle
                cx={end.x}
                cy={end.y}
                r={4}
                strokeWidth={2}
                style={{ fill: `var(--fuel-${fuel})`, stroke: 'var(--chart-surface)' }}
              />
              {showDirectLabels && (
                <>
                  {Math.abs(labelY - end.y) > 1 && (
                    <line
                      x1={end.x + 6}
                      y1={end.y}
                      x2={geometry.plotRight + 8}
                      y2={labelY}
                      className="stroke-otl-gray-300"
                      strokeWidth={1}
                    />
                  )}
                  <text
                    x={geometry.plotRight + 12}
                    y={labelY}
                    dy="0.32em"
                    className="fill-txt-black-900 text-body-xs font-medium"
                  >
                    {`${t(`fuel.series.${fuel}`)} ${price(value)}`}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {activeX !== undefined && activeRow && (
          <g>
            <line
              x1={activeX}
              x2={activeX}
              y1={margin.top}
              y2={geometry.plotBottom}
              className="stroke-otl-gray-300"
              strokeWidth={1}
            />
            {fuels.map((fuel) =>
              activeRow[fuel] === null ? null : (
                <circle
                  key={fuel}
                  cx={activeX}
                  cy={geometry.y(activeRow[fuel])}
                  r={4}
                  strokeWidth={2}
                  style={{ fill: `var(--fuel-${fuel})`, stroke: 'var(--chart-surface)' }}
                />
              ),
            )}
          </g>
        )}

        <rect
          x={margin.left}
          y={margin.top}
          width={Math.max(geometry.plotRight - margin.left, 0)}
          height={Math.max(geometry.plotBottom - margin.top, 0)}
          fill="transparent"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
        />
      </svg>

      {activeX !== undefined && activeRow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-2 min-w-40 rounded-md border border-otl-gray-200 bg-bg-white p-2 text-body-xs shadow-card"
          style={tooltipOnLeft ? { right: width - activeX + 12 } : { left: activeX + 12 }}
        >
          <p className="mb-1 text-txt-black-500">{formatDate(activeRow.date, lang)}</p>
          {fuels
            .filter((fuel) => activeRow[fuel] !== null)
            .sort((a, b) => (activeRow[b] ?? 0) - (activeRow[a] ?? 0))
            .map((fuel) => (
              <p key={fuel} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-0.5 w-3 rounded-full"
                  style={{ backgroundColor: `var(--fuel-${fuel})` }}
                />
                <strong className="text-txt-black-900">{price(activeRow[fuel] ?? 0)}</strong>
                <span className="text-txt-black-500">{t(`fuel.series.${fuel}`)}</span>
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
