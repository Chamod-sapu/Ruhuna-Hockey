// All dates are shown in Sri Lanka time (Asia/Colombo, UTC+05:30, no daylight saving).
const TZ = 'Asia/Colombo'
export const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
export const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit' }).format(new Date(iso))
export const fmtMonth = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, month: 'short' }).format(new Date(iso)).toUpperCase()
export const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
// <input type="datetime-local"> helpers (value is Sri Lanka local time)
export const toLocalInput = (iso?: string | null) =>
  iso ? new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 16) : ''
export const fromLocalInput = (value: string) => (value ? new Date(`${value}:00+05:30`).toISOString() : null)
