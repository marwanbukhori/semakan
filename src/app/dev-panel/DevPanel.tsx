import { Button } from '@govtechmy/myds-react/button';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { resetApplications } from '@/mocks/db/applications';
import {
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

  // Escape closes the panel and hands focus back to the toggle that opened it.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
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
    <div className="fixed bottom-4 right-4 z-40 flex flex-col-reverse items-end gap-2">
      <Button
        ref={toggleRef}
        variant="primary-fill"
        size="small"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {t('devPanel.toggle')}
      </Button>
      {open && (
        <section
          id={panelId}
          aria-label={t('devPanel.title')}
          className="w-72 rounded-lg border border-otl-gray-200 bg-bg-white p-4 shadow-card"
        >
          <h2 className="mb-3 font-heading text-body-md font-semibold">{t('devPanel.title')}</h2>

          <fieldset className="mb-3">
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
                  {ms === 0 ? t('devPanel.latencyNone') : `${ms} ms`}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-3">
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

          <label className="mb-4 flex items-center gap-2 text-body-sm">
            <input
              type="checkbox"
              checked={controls.emptyList}
              onChange={(event) => update({ emptyList: event.target.checked })}
            />
            {t('devPanel.emptyList')}
          </label>

          <Button variant="default-outline" size="small" onClick={resetData}>
            {t('devPanel.reset')}
          </Button>
        </section>
      )}
    </div>
  );
}
