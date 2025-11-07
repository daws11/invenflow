/**
 * Safely format a decimal value (string or number) to a fixed number of decimal places
 * Handles PostgreSQL decimal fields returned as strings by Drizzle ORM
 * 
 * @param value - The value to format (string, number, null, or undefined)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string or null if value is null/undefined
 */
export function formatDecimal(
  value: string | number | null | undefined,
  decimals: number = 2
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return null;
  }

  return numValue.toFixed(decimals);
}

/**
 * Format currency with dollar sign
 * 
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string or null
 */
export function formatCurrency(
  value: string | number | null | undefined,
  decimals: number = 2
): string | null {
  const formatted = formatDecimal(value, decimals);
  return formatted !== null ? `$${formatted}` : null;
}

/**
 * Format weight with kg suffix
 * 
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted weight string or null
 */
export function formatWeight(
  value: string | number | null | undefined,
  decimals: number = 2
): string | null {
  const formatted = formatDecimal(value, decimals);
  return formatted !== null ? `${formatted} kg` : null;
}



