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
