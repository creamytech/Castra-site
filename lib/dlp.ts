export function containsSensitiveData(text: string): boolean {
  const ssn = /\b\d{3}-\d{2}-\d{4}\b/ // US SSN
  const cc = /\b(?:\d[ -]*?){13,16}\b/ // naive credit-card
  return ssn.test(text) || cc.test(text)
}

export function isQuietHours(now: Date, startHour?: number | null, endHour?: number | null): boolean {
  if (startHour == null || endHour == null) return false
  const h = now.getHours()
  if (startHour <= endHour) return h >= startHour && h < endHour
  // overnight window, e.g., 21-8
  return h >= startHour || h < endHour
}


