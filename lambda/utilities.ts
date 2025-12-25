import { DateTime } from 'luxon'

export function getDateTime (dateString: string): DateTime {
  const dateTime = DateTime.fromISO(dateString)

  if (!dateTime.isValid) {
    throw new Error(`bad date-string: ${dateString}`)
  }

  return dateTime
}
