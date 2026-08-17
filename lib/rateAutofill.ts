// lib/rateAutofill.ts
// Intelligent rate and cost auto-fill matching across all service forms

export interface RateMatch {
  cost: number;
  price: number;
  subAgentPrice?: number;
  duration?: string;
  requiredDocuments?: string;
  remark?: string;
  supplierName: string;
  serviceName: string;
}

/**
 * Clean and normalize text for fuzzy comparison
 */
export function normalize(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse string expressions like "240+440", "1205+415", "449 ( EID+500/1000 )", or 290
 */
export function parseCostOrPrice(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim();

  // If contains addition like "240+440" or "855+435"
  if (str.includes('+')) {
    const parts = str.split('+');
    let total = 0;
    for (const part of parts) {
      const match = part.match(/[\d,.]+/);
      if (match) {
        const num = parseFloat(match[0].replace(/,/g, ''));
        if (!isNaN(num)) total += num;
      }
    }
    if (total > 0) return total;
  }

  // Extract first number in string
  const match = str.match(/[\d,.]+/);
  if (!match) return 0;
  const cleaned = match[0].replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Extract duration string from visa type (e.g. "Visit Visa (30 Days)" -> "30 Days")
 */
export function extractDuration(visaType?: string | null): string | undefined {
  if (!visaType) return undefined;
  const lower = visaType.toLowerCase();
  if (lower.includes('96 hour') || lower.includes('96hour')) return '96 Hours';
  if (lower.includes('48 hour') || lower.includes('48hour')) return '48 Hours';
  if (lower.includes('30 day') || lower.includes('30day') || lower.includes('30 days')) return '30 Days';
  if (lower.includes('60 day') || lower.includes('60day') || lower.includes('60 days')) return '60 Days';
  if (lower.includes('90 day') || lower.includes('90day') || lower.includes('90 days')) return '90 Days';
  return undefined;
}

/**
 * Check if two category / service names refer to the same service
 */
export function isCategoryMatch(a: string, b: string): boolean {
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
 * Find default supplier cost and selling price for a selected supplier & category/visa_type
 */
export function findSupplierRate(
  suppliers: any[] = [],
  supplierName?: string | null,
  categoryOrVisaType?: string | null,
  rateCards?: any[]
): RateMatch | null {
  if (!categoryOrVisaType) return null;

  const targetCategory = categoryOrVisaType.trim();
  const targetSupplier = supplierName?.trim() || '';
  const normSupplier = normalize(targetSupplier);

  // 1. Check Rate Cards Table first (matches visa_type and supplier_costs)
  if (Array.isArray(rateCards) && rateCards.length > 0) {
    const rateCard = rateCards.find(rc => {
      const rcNorm = normalize(rc.visa_type);
      const catNorm = normalize(targetCategory);
      return rcNorm === catNorm || isCategoryMatch(rc.visa_type, targetCategory);
    });

    if (rateCard) {
      let cost = 0;
      let matchedSupplierName = targetSupplier || 'Default';

      if (rateCard.supplier_costs && typeof rateCard.supplier_costs === 'object') {
        // Look for exact key match
        if (targetSupplier && rateCard.supplier_costs[targetSupplier]) {
          cost = parseCostOrPrice(rateCard.supplier_costs[targetSupplier]);
        } else {
          // Look for partial key match
          for (const [sKey, sVal] of Object.entries(rateCard.supplier_costs)) {
            const keyNorm = normalize(sKey);
            if (normSupplier && (keyNorm.includes(normSupplier) || normSupplier.includes(keyNorm))) {
              cost = parseCostOrPrice(sVal);
              matchedSupplierName = sKey;
              break;
            }
          }
          // If no supplier matched, grab first available cost as default
          if (cost === 0 && !targetSupplier) {
            const firstVal = Object.values(rateCard.supplier_costs)[0];
            if (firstVal) cost = parseCostOrPrice(firstVal);
          }
        }
      }

      const price = parseCostOrPrice(rateCard.selling_price);
      const subAgentPrice = parseCostOrPrice(rateCard.sub_agent_price);
      const duration = extractDuration(rateCard.visa_type);

      if (cost > 0 || price > 0) {
        return {
          cost,
          price,
          subAgentPrice,
          duration,
          requiredDocuments: rateCard.required_documents || '',
          remark: rateCard.remark || '',
          supplierName: matchedSupplierName,
          serviceName: rateCard.visa_type,
        };
      }
    }
  }

  // 2. Check Suppliers Table services array
  if (Array.isArray(suppliers) && suppliers.length > 0) {
    // Find matching supplier
    const supplier = suppliers.find((s: any) => {
      if (!normSupplier) return false;
      const sNorm = normalize(s.name);
      return sNorm === normSupplier || sNorm.includes(normSupplier) || normSupplier.includes(sNorm);
    });

    if (supplier && Array.isArray(supplier.services)) {
      const service = supplier.services.find((srv: any) => {
        const srvName = srv.serviceName || srv.name || '';
        return isCategoryMatch(srvName, targetCategory);
      });

      if (service) {
        const cost = parseCostOrPrice(service.defaultCost ?? service.cost);
        const price = parseCostOrPrice(service.defaultPrice ?? service.price);
        const duration = extractDuration(service.serviceName || service.name || targetCategory);

        if (cost > 0 || price > 0) {
          return {
            cost,
            price,
            duration,
            supplierName: supplier.name,
            serviceName: service.serviceName || service.name || targetCategory,
          };
        }
      }
    }
  }

  return null;
}
