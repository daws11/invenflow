import { Product, ThresholdRule, ThresholdTimeUnit } from '@invenflow/shared';

/**
 * Calculate how long a product has been in the current column (in milliseconds)
 */
export function calculateTimeInColumn(columnEnteredAt: Date | string): number {
  // Robust parsing for backend timestamps that may lack timezone info
  const parseEnteredAt = (value: Date | string): Date => {
    if (value instanceof Date) return value;
    const raw = String(value).trim();
    // Normalize space-separated datetime to ISO by injecting 'T'
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    // If string already contains timezone info (Z or +/-hh:mm), parse directly
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(normalized)) {
      return new Date(normalized);
    }
    // Assume UTC if no timezone specified to avoid local offset issues
    return new Date(`${normalized}Z`);
  };

  const enteredAt = parseEnteredAt(columnEnteredAt);
  if (isNaN(enteredAt.getTime())) {
    return 0;
  }

  const now = new Date();
  const diff = now.getTime() - enteredAt.getTime();
  // Guard against negative values due to clock or timezone skew
  return diff < 0 ? 0 : diff;
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
 * Get the applied threshold rule for a product.
 *
 * Instead of returning the first match by priority, we:
 * - Evaluate all rules that match the current time-in-column
 * - Compute a "severity" score for each:
 *   - For '>' / '>=' operators: larger time thresholds are more severe
 *   - For '<' / '<=' operators: smaller time thresholds are more severe
 * - Pick the rule with the highest severity
 * - Use priority only as a tie‑breaker when severities are equal
 *
 * This better matches user expectations for multi-level SLAs
 * (e.g. > 2 hours should override > 10 minutes when both are true).
 */
export function getAppliedThreshold(
  product: Product,
  rules: ThresholdRule[] | null | undefined
): ThresholdRule | null {
  if (!rules || rules.length === 0 || !product.columnEnteredAt) {
    return null;
  }

  // Calculate time in current column
  const timeInMs = calculateTimeInColumn(product.columnEnteredAt);

  // Helper to convert a unit back to milliseconds
  const unitToMs = (unit: ThresholdTimeUnit): number => {
    switch (unit) {
      case 'minutes':
        return 1000 * 60;
      case 'hours':
        return 1000 * 60 * 60;
      case 'days':
        return 1000 * 60 * 60 * 24;
      default:
        return 0;
    }
  };

  const matched: { rule: ThresholdRule; severity: number }[] = [];

  for (const rule of rules) {
    const timeInUnit = convertToUnit(timeInMs, rule.unit);

    // Skip rules that don't currently match
    if (!evaluateThreshold(timeInUnit, rule.operator, rule.value)) {
      continue;
    }

    const thresholdMs = rule.value * unitToMs(rule.unit);
    let severity: number;

    switch (rule.operator) {
      case '>':
      case '>=':
        // Larger thresholds (e.g. > 2 hours) are considered more severe
        severity = thresholdMs;
        break;
      case '<':
      case '<=':
        // Smaller thresholds (e.g. < 5 minutes) are considered more strict/severe
        severity = -thresholdMs;
        break;
      case '=':
      default:
        // Equality or unsupported operators get a neutral severity
        severity = 0;
        break;
    }

    matched.push({ rule, severity });
  }

  if (matched.length === 0) {
    return null;
  }

  // Sort by severity (descending), then by priority (ascending)
  matched.sort((a, b) => {
    if (b.severity !== a.severity) {
      return b.severity - a.severity;
    }
    return a.rule.priority - b.rule.priority;
  });

  return matched[0].rule;
}

/**
 * Format time duration for display
 */
export function formatTimeDuration(milliseconds: number): string {
  const totalMinutes = Math.floor(milliseconds / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  // Hide seconds entirely; show <1m for very new items
  return minutes > 0 ? `${minutes}m` : '<1m';
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

