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
