export function formatServiceDate(date: string): string {
  // Parse as noon UTC so the calendar day survives any local timezone shift.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatServiceTime(time: string): string {
  return time.slice(0, 5)
}
