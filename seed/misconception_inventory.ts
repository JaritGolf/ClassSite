/**
 * Seed: Misconception Inventory
 *
 * 50 entries from spec Appendix E.
 * Organized by reporting category; upsert by code.
 */

import { PrismaClient } from '@prisma/client'
import { REPORTING_CATEGORY_NAMES } from './reporting_categories'

interface MisconceptionDef {
  code: string
  categoryName: string
  label: string
  description: string
  commonDistractorPattern?: string
}

const MISCONCEPTIONS: MisconceptionDef[] = [
  // ── Origins and Purposes of Law and Government (M-OPLG) ───────────────────
  {
    code: 'M-OPLG-01',
    categoryName: REPORTING_CATEGORY_NAMES.ORIGINS,
    label: 'Confuses Articles of Confederation with Constitution',
    description:
      "Believes both are the founding document; doesn't recognize Articles as a failed predecessor.",
    commonDistractorPattern: 'Selects "Constitution" when asked about the first plan of government.',
  },
  {
    code: 'M-OPLG-02',
    categoryName: REPORTING_CATEGORY_NAMES.ORIGINS,
    label: 'Declaration of Independence has legal force today',
    description:
      'Treats the Declaration as a constitutional document with binding legal authority.',
    commonDistractorPattern: "Cites the Declaration when asked about today's legal rights.",
  },
  {
    code: 'M-OPLG-03',
    categoryName: REPORTING_CATEGORY_NAMES.ORIGINS,
    label: 'Confuses Magna Carta with English Bill of Rights',
    description: 'Conflates the two English influences on American government.',
    commonDistractorPattern: 'Attributes limits on the monarch to the English Bill of Rights instead of Magna Carta.',
  },
  {
    code: 'M-OPLG-04',
    categoryName: REPORTING_CATEGORY_NAMES.ORIGINS,
    label: 'Enlightenment philosophers wrote the Declaration',
    description: 'Believes Locke, Montesquieu, etc. directly authored founding documents.',
    commonDistractorPattern: 'Selects Locke as author of the Declaration rather than Jefferson.',
  },
  {
    code: 'M-OPLG-05',
    categoryName: REPORTING_CATEGORY_NAMES.ORIGINS,
    label: 'Natural rights are the same as civil rights',
    description: "Doesn't distinguish rights humans have by nature from rights government grants.",
    commonDistractorPattern: 'Treats voting (a civil right) as a natural right.',
  },
  {
    code: 'M-OPLG-06',
    categoryName: REPORTING_CATEGORY_NAMES.ORIGINS,
    label: 'U.S. founded as a pure democracy',
    description: "Doesn't recognize the deliberate choice of representative republic over direct democracy.",
    commonDistractorPattern: 'Describes the U.S. as a "democracy" without qualifying as representative/republic.',
  },
  {
    code: 'M-OPLG-07',
    categoryName: REPORTING_CATEGORY_NAMES.ORIGINS,
    label: 'Social contract is a literal written agreement',
    description: 'Treats the metaphor of the social contract concretely.',
    commonDistractorPattern: 'Looks for a signed social contract document.',
  },
  {
    code: 'M-OPLG-08',
    categoryName: REPORTING_CATEGORY_NAMES.ORIGINS,
    label: '"Consent of the governed" requires unanimous agreement',
    description: 'Misreads consent as requiring 100% rather than majority or representative processes.',
    commonDistractorPattern: 'States government actions are illegitimate unless all citizens agree.',
  },
  {
    code: 'M-OPLG-09',
    categoryName: REPORTING_CATEGORY_NAMES.ORIGINS,
    label: 'Confuses grievance with principle in Declaration',
    description:
      'Treats specific complaints about King George as the underlying philosophical principles.',
    commonDistractorPattern: 'Lists taxation grievances when asked for Enlightenment principles in the Declaration.',
  },
  {
    code: 'M-OPLG-10',
    categoryName: REPORTING_CATEGORY_NAMES.ORIGINS,
    label: 'British policies before 1776 were illegal',
    description:
      'Frames British actions as breaking law rather than as unpopular legal exercises of authority.',
    commonDistractorPattern: 'Says British taxation was "illegal" instead of "unfair" or "unconstitutional."',
  },
  {
    code: 'M-OPLG-11',
    categoryName: REPORTING_CATEGORY_NAMES.ORIGINS,
    label: 'Locke wrote the Constitution',
    description: 'Confuses the philosophical inspiration of Locke with actual authorship.',
    commonDistractorPattern: 'Selects Locke or Montesquieu as Founders.',
  },
  {
    code: 'M-OPLG-12',
    categoryName: REPORTING_CATEGORY_NAMES.ORIGINS,
    label: 'All Founders agreed on everything',
    description:
      'Misses that the founding involved significant disagreement (Federalists vs. Anti-Federalists).',
    commonDistractorPattern: 'Ignores Anti-Federalist objections when analyzing ratification.',
  },

  // ── Roles, Rights, and Responsibilities of Citizens (M-RRC) ───────────────
  {
    code: 'M-RRC-01',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'Bill of Rights protects citizens from other citizens',
    description: "Doesn't understand it limits government action, not private individuals.",
    commonDistractorPattern: 'Believes employer speech restrictions violate the First Amendment.',
  },
  {
    code: 'M-RRC-02',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'Voting is a natural right',
    description: 'Treats voting as inherent rather than as a civil right with eligibility requirements.',
    commonDistractorPattern: 'Classifies voting in the same category as life, liberty, and property.',
  },
  {
    code: 'M-RRC-03',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'First Amendment protects from any consequence',
    description:
      'Believes free speech protects against private employer or social media platform consequences.',
    commonDistractorPattern: "Argues that an employer firing someone for speech violates the First Amendment.",
  },
  {
    code: 'M-RRC-04',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'Confuses obligations and responsibilities',
    description:
      'Fails to distinguish required civic duties (taxes, jury duty) from voluntary responsibilities (vote, volunteer).',
    commonDistractorPattern: 'Lists voting as a legal obligation rather than a responsibility.',
  },
  {
    code: 'M-RRC-05',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'Due process applies only to criminals',
    description: 'Misses that due process applies broadly to many government actions affecting individuals.',
    commonDistractorPattern: 'Believes due process protections only activate after an arrest.',
  },
  {
    code: 'M-RRC-06',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'Miranda rights are all the rights you have',
    description: 'Confuses one specific protection with the broader set of constitutional rights.',
    commonDistractorPattern: 'Says someone lost "all their rights" because Miranda was not read.',
  },
  {
    code: 'M-RRC-07',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'Citizens are required to vote',
    description: 'Believes voting is mandatory in the U.S.',
    commonDistractorPattern: 'States that not voting is illegal.',
  },
  {
    code: 'M-RRC-08',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'Naturalization requirements apply to all citizens',
    description: "Doesn't distinguish between birthright citizens and naturalized citizens.",
    commonDistractorPattern: 'States that all citizens must pass the naturalization test.',
  },
  {
    code: 'M-RRC-09',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'Free press means government must publish anything',
    description: 'Misunderstands press freedom as a right of access or publication rather than non-interference.',
    commonDistractorPattern: "Argues the government must print a citizen's article.",
  },
  {
    code: 'M-RRC-10',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'Double jeopardy prevents all retrials',
    description: 'Misses that appeals and mistrials are exceptions to double jeopardy protection.',
    commonDistractorPattern: 'States a mistrial prevents any future trial for the same act.',
  },
  {
    code: 'M-RRC-11',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'All searches require a warrant',
    description: 'Misses common exceptions such as consent, exigent circumstances, and plain view.',
    commonDistractorPattern: "Believes any warrantless search automatically violates the 4th Amendment.",
  },
  {
    code: 'M-RRC-12',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'Constitutional rights begin at age 18',
    description: "Believes minors don't have constitutional protections.",
    commonDistractorPattern: 'States children have no free speech or due process rights.',
  },
  {
    code: 'M-RRC-13',
    categoryName: REPORTING_CATEGORY_NAMES.CITIZENS,
    label: 'Freedom of religion equals separation of church and state',
    description:
      'Conflates the Free Exercise Clause (individual right) with the Establishment Clause (government restriction).',
    commonDistractorPattern: 'Uses the two concepts interchangeably.',
  },

  // ── Government Policies and Political Processes (M-GPPP) ──────────────────
  {
    code: 'M-GPPP-01',
    categoryName: REPORTING_CATEGORY_NAMES.POLICIES,
    label: 'Media bias makes a source automatically false',
    description:
      'Confuses bias with falsehood; misses that biased sources can still report accurate facts.',
    commonDistractorPattern: "Dismisses all information from a biased source as false.",
  },
  {
    code: 'M-GPPP-02',
    categoryName: REPORTING_CATEGORY_NAMES.POLICIES,
    label: 'Confuses propaganda with persuasion',
    description: "Doesn't recognize the distinguishing features of propaganda (manipulation, emotional appeal, omission).",
    commonDistractorPattern: 'Labels all advertisements as propaganda.',
  },
  {
    code: 'M-GPPP-03',
    categoryName: REPORTING_CATEGORY_NAMES.POLICIES,
    label: 'Interest groups are illegal or corrupt by definition',
    description: "Doesn't recognize the legitimate role of interest groups in democracy.",
    commonDistractorPattern: 'Equates all interest group activity with corruption or bribery.',
  },
  {
    code: 'M-GPPP-04',
    categoryName: REPORTING_CATEGORY_NAMES.POLICIES,
    label: 'Political parties are branches of government',
    description: 'Confuses extra-constitutional parties with constitutional structures.',
    commonDistractorPattern: 'Lists political parties alongside the executive, legislative, and judicial branches.',
  },
  {
    code: 'M-GPPP-05',
    categoryName: REPORTING_CATEGORY_NAMES.POLICIES,
    label: 'Public policy requires unanimous agreement',
    description: 'Misses that majority and representative processes produce policy without unanimity.',
    commonDistractorPattern: 'States that one dissenting vote prevents a policy from being enacted.',
  },
  {
    code: 'M-GPPP-06',
    categoryName: REPORTING_CATEGORY_NAMES.POLICIES,
    label: 'Lobbying equals bribery',
    description: 'Conflates legal advocacy with illegal bribery.',
    commonDistractorPattern: 'States that all lobbying activity is illegal.',
  },
  {
    code: 'M-GPPP-07',
    categoryName: REPORTING_CATEGORY_NAMES.POLICIES,
    label: 'Confuses primary and general elections',
    description: "Doesn't understand the distinct functions of each stage.",
    commonDistractorPattern: 'States that candidates run against the opposing party in a primary election.',
  },
  {
    code: 'M-GPPP-08',
    categoryName: REPORTING_CATEGORY_NAMES.POLICIES,
    label: 'Third parties cannot affect elections',
    description: 'Misses spoiler effects and third-party influence on major-party platforms.',
    commonDistractorPattern: "Dismisses third parties as having zero impact on election outcomes.",
  },
  {
    code: 'M-GPPP-09',
    categoryName: REPORTING_CATEGORY_NAMES.POLICIES,
    label: 'The President sets all government policy',
    description: 'Underestimates the role of Congress, courts, agencies, and states in policymaking.',
    commonDistractorPattern: 'States that the President alone creates laws.',
  },
  {
    code: 'M-GPPP-10',
    categoryName: REPORTING_CATEGORY_NAMES.POLICIES,
    label: 'Civic engagement equals partisan political action',
    description: 'Misses non-partisan forms of civic engagement such as volunteering and community service.',
    commonDistractorPattern: 'States that civic engagement only means voting or joining a party.',
  },

  // ── Organization and Function of Government (M-OFG) ──────────────────────
  {
    code: 'M-OFG-01',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Federal supremacy means federal control of all matters',
    description:
      'Misses that federal supremacy applies only within enumerated or constitutionally granted federal powers.',
    commonDistractorPattern: 'States that the federal government can override any state law on any topic.',
  },
  {
    code: 'M-OFG-02',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'States must obey all federal laws regardless',
    description: 'Misses constitutional limits on federal power and the role of reserved state powers.',
    commonDistractorPattern: "Ignores the 10th Amendment when analyzing federal-state conflicts.",
  },
  {
    code: 'M-OFG-03',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Confuses representative and direct democracy',
    description: 'Treats them as the same form of government.',
    commonDistractorPattern: 'Describes the U.S. Congress as direct democracy.',
  },
  {
    code: 'M-OFG-04',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Supreme Court strikes down laws on its own initiative',
    description: 'Misses that the Court rules only on cases brought before it through proper channels.',
    commonDistractorPattern: 'Believes the Supreme Court can review and overturn laws without a case.',
  },
  {
    code: 'M-OFG-05',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Confuses appellate and trial courts',
    description: 'Treats them as interchangeable or misunderstands their distinct roles.',
    commonDistractorPattern: 'States that new evidence is introduced in appellate courts.',
  },
  {
    code: 'M-OFG-06',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'The President can declare laws unconstitutional',
    description: 'Confuses executive power with judicial review.',
    commonDistractorPattern: 'Attributes judicial review to the executive branch.',
  },
  {
    code: 'M-OFG-07',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Congress equals the Senate (or the House)',
    description: 'Misses that Congress is the bicameral whole comprising both chambers.',
    commonDistractorPattern: 'Uses "Congress" and "Senate" or "House" interchangeably.',
  },
  {
    code: 'M-OFG-08',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Amendments require only Congressional vote',
    description:
      'Forgets the state ratification requirement (three-fourths of states must ratify).',
    commonDistractorPattern: 'States that Congress alone can amend the Constitution.',
  },
  {
    code: 'M-OFG-09',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Confuses civil and criminal law',
    description: 'Treats civil and criminal law as the same type of case with the same processes.',
    commonDistractorPattern: 'States that a civil lawsuit can result in prison time.',
  },
  {
    code: 'M-OFG-10',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Electoral College and popular vote are the same',
    description: 'Misses the indirect election system and how electors are allocated.',
    commonDistractorPattern: 'States that the candidate with the most popular votes always wins.',
  },
  {
    code: 'M-OFG-11',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Confuses delegated, reserved, and concurrent powers',
    description:
      "Doesn't distinguish among the three categories of federalism's power distribution.",
    commonDistractorPattern: "Lists defense (federal only) as a concurrent power.",
  },
  {
    code: 'M-OFG-12',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Executive branch makes laws',
    description: 'Confuses executive orders with legislation passed by Congress.',
    commonDistractorPattern: 'States that the President creates laws through executive orders.',
  },
  {
    code: 'M-OFG-13',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Confuses judicial review and judicial activism',
    description: 'Treats the two related but distinct concepts as the same.',
    commonDistractorPattern: 'Uses "judicial review" to describe controversial rulings.',
  },
  {
    code: 'M-OFG-14',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Bill of Rights only limits federal government',
    description:
      'Forgets that the 14th Amendment incorporated most Bill of Rights protections against state governments.',
    commonDistractorPattern: 'States that states are free to violate First Amendment rights.',
  },
  {
    code: 'M-OFG-15',
    categoryName: REPORTING_CATEGORY_NAMES.ORGANIZATION,
    label: 'Confuses checks and balances with separation of powers',
    description: 'Treats the two related but distinct constitutional principles as identical.',
    commonDistractorPattern: 'Defines checks and balances as simply "dividing government into three parts."',
  },
]

export async function seedMisconceptions(prisma: PrismaClient): Promise<void> {
  // Build a map of category name → id for FK lookups
  const categories = await prisma.reportingCategory.findMany({
    select: { id: true, name: true },
  })
  const catMap = new Map(categories.map((c) => [c.name, c.id]))

  for (const m of MISCONCEPTIONS) {
    const reportingCategoryId = catMap.get(m.categoryName)
    if (!reportingCategoryId) {
      throw new Error(`Reporting category not found: "${m.categoryName}" — run seedReportingCategories first.`)
    }

    await prisma.misconception.upsert({
      where: { code: m.code },
      create: {
        code: m.code,
        reportingCategoryId,
        label: m.label,
        description: m.description,
        commonDistractorPattern: m.commonDistractorPattern ?? null,
        approvalStatus: 'APPROVED',
      },
      update: {
        label: m.label,
        description: m.description,
        commonDistractorPattern: m.commonDistractorPattern ?? null,
      },
    })
  }

  console.log(`  ✓ Misconceptions seeded (${MISCONCEPTIONS.length})`)
}
