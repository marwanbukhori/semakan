/** Dates are shown in Malaysian time whatever the viewer's time zone. */
export function formatDate(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'ms' ? 'ms-MY' : 'en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur',
  }).format(new Date(iso));
}
