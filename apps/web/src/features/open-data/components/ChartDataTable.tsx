import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@govtechmy/myds-react/table';
import { useTranslation } from 'react-i18next';
import { formatDate, formatPrice } from '@/shared/lib/format';
import type { FuelKey, LevelRow } from '../types';
import { NoValue } from './NoValue';

// #region practice:accessible-chart
/** The table view: every value the chart plots, reachable without hovering. */
export function ChartDataTable({
  levels,
  fuels,
}: {
  levels: readonly LevelRow[];
  fuels: readonly FuelKey[];
}) {
  const { t, i18n } = useTranslation();
  return (
    <details className="rounded-md border border-otl-divider p-3">
      <summary className="cursor-pointer text-body-sm font-medium text-txt-primary">
        {t('fuel.table.show')}
      </summary>
      <Table className="mt-3">
        <TableCaption className="sr-only">{t('fuel.table.caption')}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">{t('fuel.table.week')}</TableHead>
            {fuels.map((fuel) => (
              <TableHead key={fuel} className="whitespace-nowrap">
                {t(`fuel.series.${fuel}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...levels].reverse().map((row) => (
            <TableRow key={row.date}>
              <TableCell className="whitespace-nowrap">
                {formatDate(row.date, i18n.language)}
              </TableCell>
              {fuels.map((fuel) => {
                const value = row[fuel];
                return (
                  <TableCell key={fuel} className="whitespace-nowrap">
                    {value === null ? <NoValue /> : formatPrice(value, i18n.language)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </details>
  );
}
// #endregion
