import { Product, ThresholdRule, ThresholdTimeUnit } from '@invenflow/shared';

/**
 * Calculate how long a product has been in the current column (in milliseconds)
 */
export function calculateTimeInColumn(columnEnteredAt: Date | string): number {
  const enteredAt = typeof columnEnteredAt === 'string' 
    ? new Date(columnEnteredAt) 
    : columnEnteredAt;
  
  const now = new Date();
  return now.getTime() - enteredAt.getTime();
}

/**
 * Convert milliseconds to the specified unit
 */
export function convertToUnit(milliseconds: number, unit: ThresholdTimeUnit): number {
  switch (unit) {
    case 'minutes':
      return milliseconds / (1000 * 60);
    case 'hours':
      return milliseconds / (1000 * 60 * 60);
    case 'days':
      return milliseconds / (1000 * 60 * 60 * 24);
    default:
      return 0;
  }
}

/**
 * Evaluate if a threshold condition is met
 */
export function evaluateThreshold(
  timeValue: number, 
  operator: string, 
  threshold: number
): boolean {
  switch (operator) {
    case '>':
      return timeValue > threshold;
    case '<':
      return timeValue < threshold;
    case '=':
      return Math.abs(timeValue - threshold) < 0.01; // Allow small floating point error
    case '>=':
      return timeValue >= threshold;
    case '<=':
      return timeValue <= threshold;
    default:
      return false;
  }
}

/**
 * Get the first matching threshold rule based on priority
 * Returns null if no rules match
 */
export function getAppliedThreshold(
  product: Product, 
  rules: ThresholdRule[] | null | undefined
): ThresholdRule | null {
  if (!rules || rules.length === 0) {
    return null;
  }

  // Calculate time in current column
  const timeInMs = calculateTimeInColumn(product.columnEnteredAt);

  // Sort rules by priority (lower number = higher priority)
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  // Find first matching rule
  for (const rule of sortedRules) {
    const timeInUnit = convertToUnit(timeInMs, rule.unit);
    if (evaluateThreshold(timeInUnit, rule.operator, rule.value)) {
      return rule;
    }
  }

  return null;
}

/**
 * Format time duration for display
 */
export function formatTimeDuration(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

/**
 * Format threshold rule for display
 */
export function formatThresholdRule(rule: ThresholdRule): string {
  const operatorText = {
    '>': 'more than',
    '<': 'less than',
    '=': 'exactly',
    '>=': 'at least',
    '<=': 'at most',
  }[rule.operator] || rule.operator;

  const unitText = rule.value === 1 
    ? rule.unit.slice(0, -1) // Remove 's' for singular
    : rule.unit;

  return `If ${operatorText} ${rule.value} ${unitText}`;
}

