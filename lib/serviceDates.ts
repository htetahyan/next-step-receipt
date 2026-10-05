import { format } from 'date-fns';

/**
 * Profit date:
 *   visa issue date when it is set
 *   otherwise created_at (when the row was entered)
 * Travel date and a later data-entry day are never used for money.
 */
export function parseServiceDateToTimestamp(dateVal: any): number {
  if (!dateVal) return 0;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? 0 : dateVal.getTime();
  const str = String(dateVal).trim();
  if (!str) return 0;
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(str)) {
    const parts = str.split(/[\/-]/);
    const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export function toISODate(dateVal: any): string | null {
  const ts = parseServiceDateToTimestamp(dateVal);
  if (ts <= 0) return null;
  return format(new Date(ts), 'yyyy-MM-dd');
}

export function getTravelDateISO(service: any): string | null {
  const details = service?.details || {};
  return toISODate(details.travel_date || details.departure_date);
}

export type ServiceDateFields = {
  issued: string | null;
  booked: string | null;
  created: string | null;
};

/** Issue / booked / created — never travel date. */
export function getServiceDateFields(service: any): ServiceDateFields {
  const details = service?.details || {};
  return {
    issued: toISODate(
      details.visa_issued_date || details.issue_date || details.application_date || service?.issued_date
    ),
    booked: toISODate(details.booking_date || service?.booking_date),
    created: toISODate(service?.created_at),
  };
}

/** Profit day: issue date, or created_at only when issue date is blank. */
export function getProfitDateISO(service: any): string | null {
  const { issued, created } = getServiceDateFields(service);
  return issued || created;
}

export function serviceMatchesDateRange(service: any, startISO: string, endISO: string): boolean {
  const profitDate = getProfitDateISO(service);
  return !!profitDate && profitDate >= startISO && profitDate <= endISO;
}

/** Date to plot on the sales chart when the service falls in the selected range. */
export function getRangeMatchDate(service: any, startISO: string, endISO: string): string | null {
  const profitDate = getProfitDateISO(service);
  if (profitDate && profitDate >= startISO && profitDate <= endISO) return profitDate;
  return null;
}

export function getBookingDateISO(service: any): string | null {
  return getProfitDateISO(service);
}

export function serviceDateColumns(details: any) {
  const next = details || {};
  return {
    booking_date: toISODate(next.booking_date),
    issued_date: toISODate(next.visa_issued_date || next.issue_date || next.application_date),
    travel_date: toISODate(next.travel_date || next.departure_date),
  };
}

export function stampBookingDate(
  details: any,
  options?: { fallbackToday?: boolean }
): any {
  const next = { ...(details || {}) };
  if (toISODate(next.booking_date)) return next;
  const issued = toISODate(next.visa_issued_date || next.issue_date || next.application_date);
  if (issued) {
    next.booking_date = issued;
    return next;
  }
  if (options?.fallbackToday) {
    next.booking_date = format(new Date(), 'yyyy-MM-dd');
  }
  return next;
}
