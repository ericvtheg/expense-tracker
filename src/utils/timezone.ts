import {toZonedTime, fromZonedTime, format} from 'date-fns-tz';
import {parseISO} from 'date-fns';

export const PST_TIMEZONE = 'America/Los_Angeles';

export function convertPSTToUTC(date: Date): Date {
  return fromZonedTime(date, PST_TIMEZONE);
}

export function convertUTCToPST(date: Date): Date {
  return toZonedTime(date, PST_TIMEZONE);
}

export function parseUserDateInput(dateInput: string | Date | null): Date {
  if (!dateInput) {
    return convertPSTToUTC(new Date());
  }

  if (dateInput instanceof Date) {
    return convertPSTToUTC(dateInput);
  }

  const parsedDate = parseISO(dateInput);
  return convertPSTToUTC(parsedDate);
}

export function formatDateForDisplay(date: Date): string {
  const pstDate = convertUTCToPST(date);
  return format(pstDate, 'MMM d, yyyy h:mm a zzz', {timeZone: PST_TIMEZONE});
}

export function formatDateForUser(
  date: Date,
  formatString: string = 'MMM d, yyyy',
): string {
  const pstDate = convertUTCToPST(date);
  return format(pstDate, formatString, {timeZone: PST_TIMEZONE});
}

export function getCurrentPSTDate(): Date {
  return toZonedTime(new Date(), PST_TIMEZONE);
}

export function startOfDayPST(date: Date = new Date()): Date {
  const pstDate = toZonedTime(date, PST_TIMEZONE);
  pstDate.setHours(0, 0, 0, 0);
  return convertPSTToUTC(pstDate);
}

export function endOfDayPST(date: Date = new Date()): Date {
  const pstDate = toZonedTime(date, PST_TIMEZONE);
  pstDate.setHours(23, 59, 59, 999);
  return convertPSTToUTC(pstDate);
}

export function createPSTDateFromString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const pstDate = new Date();
  pstDate.setFullYear(year, month - 1, day);
  pstDate.setHours(0, 0, 0, 0);
  const utcDate = convertPSTToUTC(pstDate);
  return utcDate;
}

export function startOfDayPSTFromString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const pstDate = new Date();
  pstDate.setFullYear(year, month - 1, day);
  pstDate.setHours(0, 0, 0, 0);
  return convertPSTToUTC(pstDate);
}

export function endOfDayPSTFromString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const pstDate = new Date();
  pstDate.setFullYear(year, month - 1, day);
  pstDate.setHours(23, 59, 59, 999);
  return convertPSTToUTC(pstDate);
}
