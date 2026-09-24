import { SearchIcon } from '@govtechmy/myds-react/icon';
import { Input, InputIcon } from '@govtechmy/myds-react/input';
import { Label } from '@govtechmy/myds-react/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@govtechmy/myds-react/select';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebouncedCallback } from '@/shared/hooks/useDebouncedCallback';

/** Hides MYDS's duplicate ItemText copy inside each option (it's the item's last child). */
const ITEM_CLASS = '[&>*:last-child]:hidden';
import { APPLICATION_STATUSES, StatusFilterSchema } from '../schemas';
import type { ApplicationListParams, StatusFilter } from '../types';

export const SEARCH_DEBOUNCE_MS = 300;

type ApplicationFiltersProps = {
  q: string;
  status: StatusFilter;
  onChange: (patch: Partial<ApplicationListParams>) => void;
};

export function ApplicationFilters({ q, status, onChange }: ApplicationFiltersProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(q);
  const [lastSeenQ, setLastSeenQ] = useState(q);
  // MYDS's Select only forwards `open` to Radix once it's a defined boolean for the whole
  // lifetime of the component: internally it does `useEffect(() => setOpen(props.open), [props.open])`
  // with no guard, so an omitted `open` prop (undefined) overwrites its initial `false` state on
  // mount and flips Radix's Select.Root from controlled to uncontrolled, which Radix's dev-mode
  // useControllableState warns about. Controlling `open` ourselves keeps it a boolean always.
  const [statusOpen, setStatusOpen] = useState(false);

  // React's "adjusting state when a prop changes" pattern: this must run during render, not in an effect.
  // The URL's q changed from outside this input (e.g. "Clear filters"): adopt it.
  // Compare trimmed, so the URL's trimmed value never eats a space the user is typing.
  if (q !== lastSeenQ) {
    setLastSeenQ(q);
    if (q !== draft.trim()) setDraft(q);
  }

  const [commitSearch, cancelSearch] = useDebouncedCallback(
    (value: string) => onChange({ q: value }),
    SEARCH_DEBOUNCE_MS,
  );

  // When q changes from outside (e.g. "Clear filters"), a commit still pending from earlier
  // typing would write the old text back; drop it. Our own commits match what was typed.
  const lastTypedRef = useRef(q);
  useEffect(() => {
    if (q !== lastTypedRef.current.trim()) cancelSearch();
  }, [q, cancelSearch]);

  return (
    <div role="search" className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="application-search">{t('applications.filters.search')}</Label>
        <Input
          id="application-search"
          type="search"
          size="medium"
          value={draft}
          placeholder={t('applications.filters.searchPlaceholder')}
          onChange={(event) => {
            setDraft(event.target.value);
            lastTypedRef.current = event.target.value;
            commitSearch(event.target.value);
          }}
        >
          <InputIcon position="left">
            <SearchIcon aria-hidden="true" />
          </InputIcon>
        </Input>
      </div>
      <div className="flex flex-col gap-1.5 sm:w-56">
        <Label htmlFor="application-status">{t('applications.filters.status')}</Label>
        <Select
          value={status}
          onValueChange={(value) => onChange({ status: StatusFilterSchema.parse(value) })}
          open={statusOpen}
          onOpenChange={setStatusOpen}
          variant="outline"
          size="medium"
        >
          <SelectTrigger id="application-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/*
              MYDS's SelectItem forwards its children to Radix's ItemText with
              asChild, which requires a single element (not raw text) or Slot
              throws "failed to slot onto its children" on every render. Wrap
              the label so plain translated strings work.
              MYDS also renders those children twice (the label, then Radix's
              ItemText copy that Radix mirrors into the trigger), so the list
              hides the in-item ItemText copy; the trigger's copy is unaffected.
            */}
            <SelectItem value="all" className={ITEM_CLASS}>
              <span>{t('applications.filters.allStatuses')}</span>
            </SelectItem>
            {APPLICATION_STATUSES.map((option) => (
              <SelectItem key={option} value={option} className={ITEM_CLASS}>
                <span>{t(`status.${option}`)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
