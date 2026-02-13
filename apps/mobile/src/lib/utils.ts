/**
 * Format an enum value to a human-readable string.
 * Replaces underscores with spaces and title-cases each word.
 * @example formatEnum('YELLOW_GOLD') => 'Yellow Gold'
 */
export function formatEnum(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
