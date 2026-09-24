import { Button } from '@govtechmy/myds-react/button';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { resetApplications } from '@/mocks/db/applications';
import {
  API_SOURCE_OPTIONS,
  DATA_GOV_OPTIONS,
  DEFAULT_DEV_CONTROLS,
  FAILURE_OPTIONS,
  getDevControls,
  LATENCY_OPTIONS,
  setDevControls,
  subscribeDevControls,
  type DevControls,
} from '@/mocks/devControls';

/** Controls the mock API live, so every loading/error/empty state can be shown on demand. */
export function DevPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const controls = useSyncExternalStore(subscribeDevControls, getDevControls);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isActive = (Object.keys(DEFAULT_DEV_CONTROLS) as (keyof DevControls)[]).some(
    (key) => controls[key] !== DEFAULT_DEV_CONTROLS[key],
  );

  // Escape closes the panel and hands focus back to the toggle that opened it.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      // Only when focus is in the panel, so Escape in a dialog or dropdown doesn't also close it.
      if (!(event.target instanceof Node) || !containerRef.current?.contains(event.target)) return;
      setOpen(false);
      toggleRef.current?.focus();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const failureLabels = {
    none: t('devPanel.failureNone'),
    server: t('devPanel.failureServer'),
    network: t('devPanel.failureNetwork'),
  } satisfies Record<DevControls['failure'], string>;

  const apiSourceLabels = {
    mock: t('devPanel.apiSource.mock'),
    real: t('devPanel.apiSource.real'),
  } satisfies Record<DevControls['apiSource'], string>;

  // In production the switch isn't rendered, so apiSource is always the default 'mock'.
  const mockOnlyDisabled = import.meta.env.DEV && controls.apiSource === 'real';

  function update(patch: Partial<DevControls>) {
    setDevControls(patch);
    void queryClient.invalidateQueries();
  }

  function resetData() {
    resetApplications();
    void queryClient.invalidateQueries();
  }

  return (
    // The toggle comes first in the DOM so Tab moves from it into the panel it opens;
    // flex-col-reverse still draws the panel above the toggle.
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 z-40 flex flex-col-reverse items-end gap-2"
    >
      <Button
        ref={toggleRef}
        variant="primary-fill"
        size="small"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((isOpen) => !isOpen)}
        // A forgotten failure or latency setting would otherwise look like a real bug.
        aria-label={isActive ? t('devPanel.toggleActive') : undefined}
      >
        {t('devPanel.toggle')}
        {isActive && (
          <span
            aria-hidden="true"
            className="rounded-full bg-bg-warning-50 px-1.5 text-body-xs font-semibold text-txt-warning"
          >
            {t('devPanel.active')}
          </span>
        )}
      </Button>
      {open && (
        <section
          id={panelId}
          aria-label={t('devPanel.title')}
          className="w-72 rounded-lg border border-otl-gray-200 bg-bg-white p-4 shadow-card"
        >
          <h2 className="mb-3 font-heading text-body-md font-semibold">{t('devPanel.title')}</h2>

          <fieldset className="mb-3" disabled={mockOnlyDisabled}>
            <legend className="mb-1 text-body-sm font-medium">{t('devPanel.latency')}</legend>
            <div className="flex flex-wrap gap-3">
              {LATENCY_OPTIONS.map((ms) => (
                <label key={ms} className="inline-flex items-center gap-1 text-body-sm">
                  <input
                    type="radio"
                    name={`${panelId}-latency`}
                    checked={controls.latencyMs === ms}
                    onChange={() => update({ latencyMs: ms })}
                  />
                  {ms === 0 ? t('devPanel.latencyNone') : t('devPanel.latencyMs', { ms })}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-3" disabled={mockOnlyDisabled}>
            <legend className="mb-1 text-body-sm font-medium">{t('devPanel.failure')}</legend>
            {FAILURE_OPTIONS.map((failure) => (
              <label key={failure} className="flex items-center gap-2 text-body-sm">
                <input
                  type="radio"
                  name={`${panelId}-failure`}
                  checked={controls.failure === failure}
                  onChange={() => update({ failure })}
                />
                {failureLabels[failure]}
              </label>
            ))}
          </fieldset>

          <label className="mb-2 flex items-center gap-2 text-body-sm">
            <input
              type="checkbox"
              checked={controls.emptyList}
              disabled={mockOnlyDisabled}
              onChange={(event) => update({ emptyList: event.target.checked })}
            />
            {t('devPanel.emptyList')}
          </label>

          <label className="mb-4 flex items-center gap-2 text-body-sm">
            <input
              type="checkbox"
              checked={controls.conflictNext}
              disabled={mockOnlyDisabled}
              onChange={(event) => update({ conflictNext: event.target.checked })}
            />
            {t('devPanel.conflictNext')}
          </label>

          <fieldset className="mb-4">
            <legend className="mb-1 text-body-sm font-medium">{t('devPanel.dataGov.title')}</legend>
            {DATA_GOV_OPTIONS.map((mode) => (
              <label key={mode} className="flex items-center gap-2 text-body-sm">
                <input
                  type="radio"
                  name={`${panelId}-data-gov`}
                  checked={controls.dataGov === mode}
                  onChange={() => update({ dataGov: mode })}
                />
                {t(`devPanel.dataGov.${mode}`)}
              </label>
            ))}
          </fieldset>

          {import.meta.env.DEV && (
            <fieldset className="mb-4">
              <legend className="mb-1 text-body-sm font-medium">
                {t('devPanel.apiSource.title')}
              </legend>
              <div className="flex flex-wrap gap-3">
                {API_SOURCE_OPTIONS.map((source) => (
                  <label key={source} className="inline-flex items-center gap-1 text-body-sm">
                    <input
                      type="radio"
                      name={`${panelId}-api-source`}
                      checked={controls.apiSource === source}
                      onChange={() => update({ apiSource: source })}
                    />
                    {apiSourceLabels[source]}
                  </label>
                ))}
              </div>
              {mockOnlyDisabled && (
                <p className="mt-1 text-body-xs text-txt-black-500">
                  {t('devPanel.apiSource.mockOnlyNote')}
                </p>
              )}
            </fieldset>
          )}

          <Button variant="default-outline" size="small" onClick={resetData}>
            {t('devPanel.reset')}
          </Button>
        </section>
      )}
    </div>
  );
}
