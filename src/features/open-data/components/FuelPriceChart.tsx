import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
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
  tooltipLeft,
} from '../chart/geometry';
import type { FuelKey, LevelRow } from '../types';

const HEIGHT = 300;
const LABEL_GAP = 16;
const DIRECT_LABEL_MIN_WIDTH = 480;
const END_LABEL_OFFSET = 12;
// A fixed width for the end labels: the widest, "RON95 (BUDI95) RM 1.99", is ~145px at 12px Inter
// medium, and 156px still fits a two-digit ringgit price. The labels are a small fixed set, so a
// fixed margin avoids a measure-then-re-render pass.
const END_LABEL_WIDTH = 156;
const TOOLTIP_OFFSET = 12;
// Month labels like "Sep 2026" need about 60px; 72px keeps a clear gap between neighbours.
const MIN_TICK_SPACING = 72;
// The y-axis unit sits above the top tick label, on its own line.
const UNIT_BASELINE = 12;

// #region practice:accessible-chart
/** The row's plotted values, highest first; null weeks are left out, never read as zero. */
function visibleValues(row: LevelRow | undefined, fuels: readonly FuelKey[]) {
  if (!row) return [];
  return fuels
    .flatMap((fuel) => {
      const value = row[fuel];
      return value === null ? [] : [{ fuel, value }];
    })
    .sort((a, b) => b.value - a.value);
}
// #endregion

/**
 * Whether focus came from the keyboard. Clicking also focuses the chart (it is a tab stop), and
 * that should not speak; `:focus-visible` is the browser's own keyboard-or-not decision. A browser
 * without it throws on the selector, and then every focus announces, as before.
 */
function isKeyboardFocus(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

type FuelPriceChartProps = {
  levels: readonly LevelRow[];
  fuels: readonly FuelKey[];
  rangeLabel: string;
};

export function FuelPriceChart({ levels, fuels, rangeLabel }: FuelPriceChartProps) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(containerRef, 720);
  // `active` drives the crosshair and tooltip (mouse or keyboard); `announced` drives the live
  // region, and only focus and keys change it, so hovering does not flood screen readers.
  const [active, setActive] = useState<number | null>(null);
  const [announced, setAnnounced] = useState<number | null>(null);
  const instructionsId = useId();
  const summaryId = useId();

  const showDirectLabels = width >= DIRECT_LABEL_MIN_WIDTH;
  const margin = {
    top: 32,
    right: showDirectLabels ? END_LABEL_OFFSET + END_LABEL_WIDTH : 16,
    bottom: 32,
    left: 48,
  };
  const lang = i18n.language;
  const price = (value: number) => t('fuel.price', { value: formatPrice(value, lang) });

  // #region practice:measured-memo
  const geometry = useMemo(() => {
    const plotRight = width - margin.right;
    const plotBottom = HEIGHT - margin.bottom;
    const values = levels.flatMap((row) =>
      fuels.flatMap((fuel) => (row[fuel] === null ? [] : [row[fuel]])),
    );
    const domain = niceDomain(values);
    // Position weeks by their real dates, so an irregular gap between releases reads truthfully.
    const times = levels.map((row) => Date.parse(row.date));
    const x = linearScale([times[0] ?? 0, times.at(-1) ?? 0], [margin.left, plotRight]);
    const y = linearScale(domain, [plotBottom, margin.top]);
    const xs = times.map(x);
    const series = fuels.map((fuel) => {
      const points = levels.map((row, i) => {
        const value = row[fuel];
        return value === null ? null : { x: xs[i]!, y: y(value), value };
      });
      const end = points.findLast((point) => point !== null) ?? null;
      return { fuel, points, end };
    });
    const labelY = layoutEndLabels(
      series.flatMap(({ fuel, end }) => (end ? [{ key: fuel, y: end.y }] : [])),
      LABEL_GAP,
      [margin.top, plotBottom],
    );
    return {
      hasData: values.length > 0,
      plotRight,
      plotBottom,
      domain,
      y,
      xs,
      series,
      labelY,
      monthTicks: monthTickIndexes(
        levels.map((r) => r.date),
        xs,
        MIN_TICK_SPACING,
      ),
    };
  }, [width, levels, fuels, margin.left, margin.right, margin.top, margin.bottom]);
  // #endregion

  const { hasData } = geometry;
  const activeRow = active === null ? undefined : levels[active];
  const activeValues = visibleValues(activeRow, fuels);
  const announcedRow = announced === null ? undefined : levels[announced];
  const readout = announcedRow
    ? [
        formatDate(announcedRow.date, lang),
        ...visibleValues(announcedRow, fuels).map(
          ({ fuel, value }) => `${t(`fuel.series.${fuel}`)} ${price(value)}`,
        ),
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

  function show(index: number | null) {
    setActive(index);
    setAnnounced(index);
  }

  function onFocus(event: FocusEvent<HTMLDivElement>) {
    if (!hasData || !isKeyboardFocus(event.currentTarget)) return;
    show(active ?? levels.length - 1);
  }

  // #region practice:keyboard
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Leave browser and assistive-technology shortcuts (Alt+Left and the like) alone.
    if (!hasData || event.altKey || event.ctrlKey || event.metaKey) return;
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
      show(null);
      return;
    }
    if (next === undefined) return;
    event.preventDefault();
    show(next);
  }
  // #endregion

  const activeX = active === null ? undefined : geometry.xs[active];

  // Place the tooltip from its real rendered width, which changes with the week's fuels and the
  // language, so this runs after every render. It writes the DOM rather than state, so there is no
  // second render, and a layout effect runs before paint, so the tooltip never shows misplaced.
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip || activeX === undefined) return;
    tooltip.style.left = `${tooltipLeft(activeX, tooltip.offsetWidth, width, TOOLTIP_OFFSET)}px`;
  });

  if (!hasData) {
    // The same element as the chart below, so the width observer keeps watching it.
    return (
      <div ref={containerRef} className="fuel-chart relative">
        <p className="text-body-sm text-txt-black-500">{t('fuel.chart.empty')}</p>
      </div>
    );
  }

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
      onFocus={onFocus}
      onBlur={() => show(null)}
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
        <text x={0} y={UNIT_BASELINE} className="fill-txt-black-500 text-body-xs">
          {t('fuel.unit')}
        </text>
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

        {geometry.series.map(({ fuel, end }) => {
          if (!end) return null;
          const labelY = geometry.labelY[fuel] ?? end.y;
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
                    x={geometry.plotRight + END_LABEL_OFFSET}
                    y={labelY}
                    dy="0.32em"
                    className="fill-txt-black-900 text-body-xs font-medium"
                  >
                    {`${t(`fuel.series.${fuel}`)} ${price(end.value)}`}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {activeX !== undefined && (
          <g>
            <line
              data-crosshair
              x1={activeX}
              x2={activeX}
              y1={margin.top}
              y2={geometry.plotBottom}
              className="stroke-otl-gray-300"
              strokeWidth={1}
            />
            {activeValues.map(({ fuel, value }) => (
              <circle
                key={fuel}
                cx={activeX}
                cy={geometry.y(value)}
                r={4}
                strokeWidth={2}
                style={{ fill: `var(--fuel-${fuel})`, stroke: 'var(--chart-surface)' }}
              />
            ))}
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
          ref={tooltipRef}
          data-chart-tooltip
          aria-hidden="true"
          className="pointer-events-none absolute top-2 min-w-40 rounded-md border border-otl-gray-200 bg-bg-white p-2 text-body-xs shadow-card"
        >
          <p className="mb-1 text-txt-black-500">{formatDate(activeRow.date, lang)}</p>
          {activeValues.map(({ fuel, value }) => (
            <p key={fuel} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-0.5 w-3 rounded-full"
                style={{ backgroundColor: `var(--fuel-${fuel})` }}
              />
              <strong className="text-txt-black-900">{price(value)}</strong>
              <span className="text-txt-black-500">{t(`fuel.series.${fuel}`)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
