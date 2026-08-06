const locale = 'es-MX'
const timeZone = 'America/Mexico_City'

export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone,
    ...options,
  }).format(new Date(value))
}

export function formatRelative(value: string | Date, now = new Date()): string {
  const difference = new Date(value).getTime() - now.getTime()
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000_000],
    ['month', 2_592_000_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ]
  const [unit, milliseconds] = units.find(([, size]) => Math.abs(difference) >= size) ?? ['second', 1]
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.round(difference / milliseconds), unit)
}
