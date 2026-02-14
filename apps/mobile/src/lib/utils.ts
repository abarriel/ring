/**
 * Derive up to 2 initials from a display name.
 *
 * @example getInitials('Alice') => 'A'
 * @example getInitials('Alice Bob') => 'AB'
 * @example getInitials('Jean Pierre Martin') => 'JP'
 */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Format an enum value for display.
 * Replaces underscores with spaces and capitalizes first letters.
 *
 * @example formatEnum('YELLOW_GOLD') => 'Yellow Gold'
 * @example formatEnum('PRINCESS') => 'Princess'
 */
export function formatEnum(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
