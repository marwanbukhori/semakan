import { ArrowDownIcon, ArrowUpIcon } from '@govtechmy/myds-react/icon';
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
import type { ChangeRow, FuelKey, LevelRow } from '../types';

type LatestPricesTableProps = {
  levels: readonly LevelRow[];
  changes: readonly ChangeRow[];
  fuels: readonly FuelKey[];
  weeks?: number;
};

export function LatestPricesTable({ levels, changes, fuels, weeks = 6 }: LatestPricesTableProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const changeByDate = new Map(changes.map((row) => [row.date, row]));
  const rows = levels.slice(-weeks).reverse();

  return (
    <section aria-labelledby="latest-heading" className="flex flex-col gap-2">
      <h2 id="latest-heading" className="font-heading text-body-lg font-semibold">
        {t('fuel.latest.title')}
      </h2>
      <Table>
        <TableCaption className="sr-only">{t('fuel.latest.caption')}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>{t('fuel.latest.week')}</TableHead>
            {fuels.map((fuel) => (
              <TableHead key={fuel}>{t(`fuel.series.${fuel}`)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.date}>
              <TableCell className="whitespace-nowrap">{formatDate(row.date, lang)}</TableCell>
              {fuels.map((fuel) => {
                const value = row[fuel];
                return (
                  <TableCell key={fuel} className="whitespace-nowrap">
                    {value === null ? '—' : t('fuel.price', { value: formatPrice(value, lang) })}
                    <Change delta={changeByDate.get(row.date)?.[fuel] ?? null} />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

/** Direction by icon and words, not colour: a price change is not a status. */
function Change({ delta }: { delta: number | null }) {
  const { t, i18n } = useTranslation();
  if (delta === null) return null;
  const amount = formatPrice(Math.abs(delta), i18n.language);
  if (Math.abs(delta) < 0.005) {
    return <span className="ml-2 text-body-xs text-txt-black-500">{t('fuel.latest.same')}</span>;
  }
  const up = delta > 0;
  const Icon = up ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span className="ml-2 inline-flex items-center gap-0.5 text-body-xs text-txt-black-500">
      <Icon aria-hidden="true" className="size-3" />
      <span className="sr-only">
        {up ? t('fuel.latest.up', { value: amount }) : t('fuel.latest.down', { value: amount })}
      </span>
      <span aria-hidden="true">{amount}</span>
    </span>
  );
}
