const locale = (language: string) => (language === 'ms' ? 'ms-MY' : 'en-MY');

/** Dates are shown in Malaysian time whatever the viewer's time zone. */
export function formatDate(iso: string, language: string): string {
  return new Intl.DateTimeFormat(locale(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, language: string): string {
  return new Intl.DateTimeFormat(locale(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kuala_Lumpur',
  }).format(new Date(iso));
}

/** Two decimals; also removes float noise such as 0.35000000000000053. */
export function formatPrice(value: number, language: string): string {
  return new Intl.NumberFormat(locale(language), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMonthYear(isoDate: string, language: string): string {
  return new Intl.DateTimeFormat(locale(language), {
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur',
  }).format(new Date(isoDate));
}
