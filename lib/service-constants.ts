// ── Categories ──────────────────────────────────────────────
export const SERVICE_CATEGORIES = [
  // UAE Visa
  'UAE Visit Visa 30 Days',
  'UAE Visit Visa 60 Days',
  'UAE Transit Visa',
  'UAE Multi Entry Visa',
  'Visa Change by Bus',
  'Visa Change by Air',
  'Inside Visa Extension',
  'Oman Visit Visa',
  '30 Days Visa Extension',
  // Air Tickets
  'Air Ticket',
  'Dummy Ticket',
  'Ticket + Hotel Package',
  // Other Visa
  'Schengen / EU Visa',
  'Japan Visa',
  'China Visa',
  'Korea Visa',
  'Armenia Visa',
  'UK Visa',
  'Other Country Visa',
  'Consultation Only',
  // General
  'Passport Renew',
  'Other',
] as const;

// ── UAE Visa Categories ─────────────────────────────────────
export const UAE_VISA_CATEGORIES = [
  'UAE Visit Visa 30 Days',
  'UAE Visit Visa 60 Days',
  'UAE Transit Visa',
  'UAE Multi Entry Visa',
  'Visa Change by Bus',
  'Visa Change by Air',
  'Inside Visa Extension',
  'Oman Visit Visa',
  '30 Days Visa Extension',
] as const;

// ── Air Ticket Categories ───────────────────────────────────
export const AIR_TICKET_CATEGORIES = [
  'Air Ticket',
  'Dummy Ticket',
  'Ticket + Hotel Package',
] as const;

// ── Other Visa Categories ───────────────────────────────────
export const OTHER_VISA_CATEGORIES = [
  'Schengen / EU Visa',
  'Japan Visa',
  'China Visa',
  'Korea Visa',
  'Armenia Visa',
  'UK Visa',
  'Other Country Visa',
  'Consultation Only',
] as const;

export type DashboardGroup = 'UAE Visa' | 'Air Tickets' | 'Tour Packages' | 'Other Visas' | 'Custom Service';

export function moduleEditPath(service: { id: string; category?: string | null; reference_id?: string | null }): string {
  switch (dashboardServiceGroup(service.category, service.reference_id)) {
    case 'Air Tickets':
      return `/dashboard/air-tickets/${service.id}`;
    case 'Tour Packages':
      return `/dashboard/tour-packages/${service.id}`;
    case 'Other Visas':
      return `/dashboard/other-visa/${service.id}`;
    case 'Custom Service':
      return `/dashboard/custom-service/${service.id}`;
    default:
      return `/dashboard/uae-visa/${service.id}`;
  }
}

/** Reference prefixes are the source of truth: AT/TK air, CS custom, AE UAE, OV/OT other visa, TP tour. */
export function groupFromReference(referenceId?: string | null): DashboardGroup | null {
  const prefix = (String(referenceId || '').toUpperCase().match(/^[A-Z]+/)?.[0] || '');
  if (!prefix) return null;
  if (prefix === 'AT' || prefix === 'TK' || prefix.startsWith('AT')) return 'Air Tickets';
  if (prefix === 'CS' || prefix.startsWith('CS')) return 'Custom Service';
  if (prefix === 'AE' || prefix.startsWith('AE')) return 'UAE Visa';
  if (prefix === 'OV' || prefix === 'OT' || prefix.startsWith('OV')) return 'Other Visas';
  if (prefix === 'TP' || prefix.startsWith('TP')) return 'Tour Packages';
  return null;
}

/** Positive groups only. Unknown work is Custom Service, never Other Visas. */
export function dashboardServiceGroup(category?: string | null, referenceId?: string | null): DashboardGroup {
  const byRef = groupFromReference(referenceId);
  if (byRef) return byRef;

  const cat = (category || '').trim();
  const lower = cat.toLowerCase();
  if (!cat) return 'Custom Service';

  if (
    (AIR_TICKET_CATEGORIES as readonly string[]).includes(cat) ||
    lower.includes('ticket') ||
    lower.includes('flight') ||
    lower.includes('airline') ||
    lower.includes('dummy ticket')
  ) {
    return 'Air Tickets';
  }

  if ((UAE_VISA_CATEGORIES as readonly string[]).includes(cat) || isUaeVisaCategory(cat)) {
    return 'UAE Visa';
  }

  if (isOtherCountryVisa(lower, cat)) {
    return 'Other Visas';
  }

  if (
    lower.includes('tour') ||
    lower.includes('safari') ||
    (lower.includes('package') && !lower.includes('ticket')) ||
    (lower.includes('hotel') && !lower.includes('ticket'))
  ) {
    return 'Tour Packages';
  }

  return 'Custom Service';
}

function isOtherCountryVisa(lower: string, cat: string): boolean {
  if ((OTHER_VISA_CATEGORIES as readonly string[]).includes(cat)) return true;
  return (
    lower.includes('schengen') ||
    lower.includes('japan') ||
    lower.includes('china') ||
    lower.includes('korea') ||
    lower.includes('armenia') ||
    lower.includes('britain') ||
    lower.includes('uk visa') ||
    lower.includes('united kingdom') ||
    lower.includes('other country') ||
    lower.includes('consultation') ||
    lower.includes('usa') ||
    lower.includes('canada') ||
    lower.includes('australia') ||
    lower.includes('europe')
  );
}

/** Positive match only — unknown custom services must NOT appear on the UAE visa tracker. */
export function isUaeVisaCategory(category?: string | null): boolean {
  if (!category) return false;
  const cat = category.trim();
  const lower = cat.toLowerCase();

  if ((UAE_VISA_CATEGORIES as readonly string[]).includes(cat)) return true;
  if ((AIR_TICKET_CATEGORIES as readonly string[]).includes(cat)) return false;
  if ((OTHER_VISA_CATEGORIES as readonly string[]).includes(cat)) return false;

  if (
    lower.includes('tour package') ||
    lower.includes('safari') ||
    lower.includes('ticket') ||
    lower.includes('flight') ||
    lower.includes('airline') ||
    lower.includes('schengen') ||
    lower.includes('japan') ||
    lower.includes('china') ||
    lower.includes('korea') ||
    lower.includes('armenia') ||
    lower.includes('uk visa') ||
    lower.includes('other country') ||
    lower.includes('consultation') ||
    lower.includes('passport') ||
    lower.includes('insurance') ||
    lower.includes('attestation') ||
    lower.includes('hotel package')
  ) {
    return false;
  }

  return (
    lower.includes('uae') ||
    lower.includes('visit visa') ||
    lower.includes('visa change') ||
    lower.includes('inside visa') ||
    lower.includes('a2a') ||
    lower.includes('transit visa') ||
    lower.includes('multi entry') ||
    lower.includes('multi-entry') ||
    lower.includes('oman') ||
    lower.includes('visa extension') ||
    (lower.includes('bus') && lower.includes('visa')) ||
    (lower.includes('air') && lower.includes('visa change'))
  );
}

// ── Suppliers ───────────────────────────────────────────────
export const VISA_SUPPLIERS = [
  'DAHR',
  'Incel Tourism',
  'AKSM',
  'Surprise Tourism',
  'Hatta Sky',
  'Other',
] as const;

// ── Statuses ────────────────────────────────────────────────
export const SERVICE_STATUSES = [
  'Open',
  'In Progress',
  'Closed',
  'Cancelled',
  'Refund Pending',
] as const;

// ── Custom Service Suggestions ──────────────────────────────
export const CUSTOM_SERVICE_SUGGESTIONS = [
  'Dummy Flight',
  'Passport Renew',
  'Passport Extension',
  'Document Attestation',
  'Medical Insurance',
  'Emirates ID',
  'Typing Services',
  'Translation',
  'Travel Insurance',
  'Hotel Booking',
  'Car Rental',
  'OK to Board',
  'Consultation Only',
  'Other',
] as const;
