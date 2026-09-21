import { format } from 'date-fns';

/**
 * Booking date (profit / KPI / sales):
 *   details.booking_date → visa issued / application date → created_at
 * Travel date is NEVER used for money.
 *
 * Historical rows often have created_at copied from travel_date.
 * If created_at is the same calendar day as travel_date, ignore created_at
 * when an issue/booking date exists.
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

export function getBookingDateISO(service: any): string | null {
  const details = service?.details || {};
  const issued = toISODate(
    details.booking_date || details.visa_issued_date || details.issue_date || details.application_date
  );
  if (issued) return issued;

  const created = toISODate(service?.created_at);
  const travel = getTravelDateISO(service);
  if (created && travel && created === travel) {
    return created;
  }
  return created;
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
