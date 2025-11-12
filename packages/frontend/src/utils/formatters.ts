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

/**
 * Format date with time in format: "M/D/YYYY at HH:MM"
 * Example: "11/6/2025 at 16:09"
 * 
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date string with time
 */
export function formatDateWithTime(date: string | Date | number | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;

  if (isNaN(dateObj.getTime())) return '';

  const month = dateObj.getMonth() + 1; // getMonth() returns 0-11
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  
  // Format time with leading zeros
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  return `${month}/${day}/${year} at ${formattedTime}`;
}





