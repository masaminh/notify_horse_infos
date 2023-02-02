import { DateTime } from 'luxon';

// eslint-disable-next-line import/prefer-default-export
export function getDateTime(dateString: string): DateTime {
  const dateTime = DateTime.fromISO(dateString);

  if (!dateTime.isValid) {
    throw new Error(`bad date-string: ${dateString}`);
  }

  return dateTime;
}
