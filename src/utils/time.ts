/**
 * UAE Time Utilities (Gulf Standard Time, UTC+4)
 */

export function getUaeNow(): Date {
  // Return current Date adjusted or formatted for Asia/Dubai
  return new Date();
}

export function getUaeTodayDateString(): string {
  const d = new Date();
  // format YYYY-MM-DD in Asia/Dubai
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD
  return formatter.format(d);
}

export const getUaeCurrentDateString = getUaeTodayDateString;

export function getUaeTimeString(): string {
  const d = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Dubai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  // format in Arabic like 07:45 ص
  const formatted = new Intl.DateTimeFormat('ar-AE', options).format(d);
  return formatted;
}

export const getUaeCurrentTimeString = getUaeTimeString;

export function getUaeFullDateTimeString(): string {
  const d = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Dubai',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  return new Intl.DateTimeFormat('ar-AE', options).format(d);
}

export function formatArabicDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Intl.DateTimeFormat('ar-AE', options).format(date);
  } catch {
    return dateStr;
  }
}

export function getDayNameInArabic(dateStr?: string): string {
  if (!dateStr) {
    return new Intl.DateTimeFormat('ar-AE', { weekday: 'long' }).format(new Date());
  }
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return '';
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('ar-AE', { weekday: 'long' }).format(date);
  } catch {
    return '';
  }
}

export const getDayNameFromDateString = getDayNameInArabic;

export function getUaeTomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  return new Intl.DateTimeFormat('en-CA', options).format(d);
}

export function getFormattedDateParts(dateStr?: string): { day: string; month: string; year: string } {
  if (!dateStr) return { day: '   ', month: '   ', year: '      ' };
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return {
      year: parts[0],
      month: parts[1],
      day: parts[2],
    };
  }
  return { day: '   ', month: '   ', year: '      ' };
}
