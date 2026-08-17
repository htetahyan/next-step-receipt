// lib/rateAutofill.ts
// Intelligent rate and cost auto-fill matching across all service forms

export interface RateMatch {
  cost: number;
  price: number;
  supplierName: string;
  serviceName: string;
}

/**
 * Clean and normalize text for fuzzy comparison
 */
function normalize(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract leading numeric value from strings like "449 ( EID+500/1000 )" or "1100"
 */
function parseNumeric(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const match = String(val).match(/[\d,.]+/);
  if (!match) return 0;
  const cleaned = match[0].replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Check if two category / service names refer to the same service
 */
function isCategoryMatch(a: string, b: string): boolean {
  const normA = normalize(a);
  const normB = normalize(b);
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // Specific keyword heuristics
  const checkPair = (kw1: string, kw2: string) =>
    normA.includes(kw1) && normA.includes(kw2) && normB.includes(kw1) && normB.includes(kw2);

  if (checkPair('30', 'visa')) return true;
  if (checkPair('60', 'visa')) return true;
  if (checkPair('bus', 'change') || checkPair('bus', 'visa')) return true;
  if (checkPair('air', 'change') || checkPair('air', 'visa')) return true;
  if (checkPair('extension', 'inside') || checkPair('extension', 'visa')) return true;
  if (checkPair('dummy', 'ticket')) return true;
  if (checkPair('ticket', 'hotel') || checkPair('package', 'hotel')) return true;
  if (checkPair('schengen', 'visa')) return true;
  if (checkPair('japan', 'visa')) return true;
  if (checkPair('china', 'visa')) return true;
  if (checkPair('korea', 'visa')) return true;
  if (checkPair('oman', 'visa')) return true;

  return false;
}

/**
 * Find default supplier cost and selling price for a selected supplier & category
 */
export function findSupplierRate(
  suppliers: any[] = [],
  supplierName?: string | null,
  category?: string | null
): RateMatch | null {
  if (!supplierName || !category || !Array.isArray(suppliers) || suppliers.length === 0) {
    return null;
  }

  const normSupplier = normalize(supplierName);

  // 1. Find matching supplier (exact or partial name)
  const supplier = suppliers.find((s: any) => {
    const sNorm = normalize(s.name);
    return sNorm === normSupplier || sNorm.includes(normSupplier) || normSupplier.includes(sNorm);
  });

  if (!supplier || !Array.isArray(supplier.services)) {
    return null;
  }

  // 2. Find matching service in supplier.services
  const service = supplier.services.find((srv: any) => {
    const srvName = srv.serviceName || srv.name || '';
    return isCategoryMatch(srvName, category);
  });

  if (!service) return null;

  const cost = parseNumeric(service.defaultCost ?? service.cost);
  const price = parseNumeric(service.defaultPrice ?? service.price);

  if (cost === 0 && price === 0) return null;

  return {
    cost,
    price,
    supplierName: supplier.name,
    serviceName: service.serviceName || service.name || category,
  };
}
