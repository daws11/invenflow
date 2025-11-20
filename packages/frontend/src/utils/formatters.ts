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
 * Format currency with Indonesian Rupiah
 * Automatically adds thousand separators using Indonesian formatting
 *
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted currency string or null
 */
export function formatCurrency(
  value: string | number | null | undefined,
  decimals: number = 0
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return null;
  }

  // Format with Indonesian locale (uses dot as thousand separator)
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);

  return `Rp${formatted}`;
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
 * Format number input with thousand separators for Indonesian locale
 * Used for input fields to show formatted numbers while typing
 *
 * @param value - The numeric value to format
 * @returns Formatted string with thousand separators
 */
export function formatNumberInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // Remove any existing dots (thousand separators) and convert to number
  const cleanValue = value.toString().replace(/\./g, '');
  const numValue = parseFloat(cleanValue);

  if (isNaN(numValue)) {
    return cleanValue; // Return as-is if not a valid number
  }

  // Format with Indonesian locale (uses dot as thousand separator, no decimals for input)
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(numValue);
}

/**
 * Parse formatted number input back to numeric value
 * Removes thousand separators and returns clean number
 *
 * @param formattedValue - The formatted string value
 * @returns Clean numeric value
 */
export function parseNumberInput(formattedValue: string): number {
  if (!formattedValue) return 0;

  // Remove thousand separators (dots) and parse
  const cleanValue = formattedValue.replace(/\./g, '');
  const numValue = parseFloat(cleanValue);

  return isNaN(numValue) ? 0 : numValue;
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








