/**
 * Robust financial number parser that safely handles numbers, strings with commas (e.g. "1,400.50"),
 * currency symbols ("AED 500"), undefined, null, and NaN.
 */
export function parseFinancialNumber(val: any, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : val;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '').trim();
    if (!cleaned) return fallback;
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Format a number or string amount to a clean locale string (e.g. "11,400")
 */
export function formatCurrencyAmount(val: any, fallback: string = '0'): string {
  const num = parseFinancialNumber(val, 0);
  return num.toLocaleString();
}
