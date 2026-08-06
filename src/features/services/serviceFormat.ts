export function formatServiceDate(date: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  }).format(new Date(`${date}T12:00:00Z`))
}

export function formatServiceDay(date: string): string {
  const day = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    timeZone: 'America/Mexico_City',
  }).format(new Date(`${date}T12:00:00Z`))
  return day.charAt(0).toUpperCase() + day.slice(1)
}

export function formatServiceDateOnly(date: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  }).format(new Date(`${date}T12:00:00Z`))
}

export function formatServiceTime(time: string): string {
  return time.slice(0, 5)
}
