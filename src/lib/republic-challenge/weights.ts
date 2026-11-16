/**
 * Florida Civics EOC blueprint weights by reporting category (spec §19).
 * Midpoints of each published blueprint range. Curriculum constants — these
 * are not derived from, or adjusted by, any student result.
 */
export const REPORTING_CATEGORY_WEIGHTS: Record<string, number> = {
  'Origins and Purposes': 0.275, // 25-30% midpoint
  'Roles, Rights, and Responsibilities': 0.275,
  'Government Policies': 0.175, // 15-20% midpoint
  'Organization and Function': 0.225, // 20-25% midpoint
}

/** Weight for a reporting category by (partial, case-insensitive) name. */
export function weightForCategoryName(name: string): number {
  const nameLower = name.toLowerCase()
  for (const [key, weight] of Object.entries(REPORTING_CATEGORY_WEIGHTS)) {
    if (nameLower.includes(key.toLowerCase())) return weight
  }
  return 0.25
}
