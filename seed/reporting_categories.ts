/**
 * Seed: Reporting Categories
 *
 * Four EOC blueprint groupings per spec Section 7.3.
 * Blueprint weights are approximate per FDOE; configurable lookup per spec.
 * Idempotent: upsert by name.
 */

import { PrismaClient } from '@prisma/client'

export const REPORTING_CATEGORY_NAMES = {
  ORIGINS: 'Origins and Purposes of Law and Government',
  CITIZENS: 'Roles, Rights, and Responsibilities of Citizens',
  POLICIES: 'Government Policies and Political Processes',
  ORGANIZATION: 'Organization and Function of Government',
} as const

export async function seedReportingCategories(prisma: PrismaClient): Promise<void> {
  const categories = [
    {
      name: REPORTING_CATEGORY_NAMES.ORIGINS,
      blueprintWeightMin: 0.25,
      blueprintWeightMax: 0.30,
      description:
        'Covers Enlightenment influences, founding documents, natural rights, social contract, ' +
        'origins of democracy, Declaration of Independence, Articles of Confederation, and the Constitution. ' +
        'Corresponds to SS.7.CG.1.x benchmarks.',
    },
    {
      name: REPORTING_CATEGORY_NAMES.CITIZENS,
      blueprintWeightMin: 0.25,
      blueprintWeightMax: 0.30,
      description:
        'Covers citizenship, civic rights and responsibilities, Bill of Rights, due process, ' +
        'civil rights, elections, media, public opinion, and civic participation. ' +
        'Corresponds to SS.7.CG.2.x benchmarks.',
    },
    {
      name: REPORTING_CATEGORY_NAMES.POLICIES,
      blueprintWeightMin: 0.15,
      blueprintWeightMax: 0.20,
      description:
        'Covers public policy process, political parties, interest groups, lobbying, media influence, ' +
        'bias, civic engagement, and policy problem-solving. ' +
        'Corresponds to SS.7.CG.2.6–2.10 benchmarks.',
    },
    {
      name: REPORTING_CATEGORY_NAMES.ORGANIZATION,
      blueprintWeightMin: 0.20,
      blueprintWeightMax: 0.25,
      description:
        'Covers branches of government, federalism, checks and balances, separation of powers, ' +
        'courts, lawmaking, amendments, Electoral College, and constitutional structures. ' +
        'Corresponds to SS.7.CG.3.x benchmarks.',
    },
  ]

  for (const cat of categories) {
    await prisma.reportingCategory.upsert({
      where: { name: cat.name },
      create: cat,
      update: {
        blueprintWeightMin: cat.blueprintWeightMin,
        blueprintWeightMax: cat.blueprintWeightMax,
        description: cat.description,
      },
    })
  }

  console.log(`  ✓ Reporting categories seeded (${categories.length})`)
}
