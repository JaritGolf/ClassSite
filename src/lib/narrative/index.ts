import { prisma } from '@/lib/db'

export interface NarrativeBeat {
  beatKey: string
  npcName: string
  dialogue: string
  unitCode: string
}

// Hardcoded narrative beats per unit — expandable as more units ship
export const NARRATIVE_BEATS: NarrativeBeat[] = [
  // Unit 1: Foundations of American Government
  {
    beatKey: 'unit-1-intro',
    npcName: 'Founder',
    dialogue:
      "Welcome to the Republic, Founder! The nation needs you. Our mission: understand how American democracy was built — and how YOU can protect it. Ready to begin?",
    unitCode: 'unit-1',
  },
  {
    beatKey: 'unit-1-skeptic',
    npcName: 'Skeptic',
    dialogue:
      "Hold on — who says these Enlightenment ideas actually worked? Before you accept everything you read, you'll need to analyze the evidence yourself. That's what real civic thinking looks like.",
    unitCode: 'unit-1',
  },
  {
    beatKey: 'unit-1-citizen',
    npcName: 'Citizen',
    dialogue:
      "I voted for the first time last year and I had no idea what half the ballot meant. That's why I need you — help me understand how our government actually works!",
    unitCode: 'unit-1',
  },
]

export function getBeatsForUnitCode(unitCode: string): NarrativeBeat[] {
  return NARRATIVE_BEATS.filter((b) => b.unitCode === unitCode)
}

export async function getFirstUnreadBeat(
  studentId: string,
  unitId: string,
  unitCode: string
): Promise<NarrativeBeat | null> {
  const allBeats = getBeatsForUnitCode(unitCode)
  if (allBeats.length === 0) return null

  const progress = await prisma.narrativeProgress.findUnique({
    where: { studentId_unitId: { studentId, unitId } },
    select: { beatsReadJson: true, skipAllNpcs: true },
  })

  if (progress?.skipAllNpcs) return null

  const readKeys: string[] = Array.isArray(progress?.beatsReadJson)
    ? (progress.beatsReadJson as string[])
    : []

  return allBeats.find((b) => !readKeys.includes(b.beatKey)) ?? null
}

export async function markBeatRead(
  studentId: string,
  unitId: string,
  beatKey: string
): Promise<void> {
  const existing = await prisma.narrativeProgress.findUnique({
    where: { studentId_unitId: { studentId, unitId } },
    select: { id: true, beatsReadJson: true },
  })

  if (existing) {
    const readKeys: string[] = Array.isArray(existing.beatsReadJson)
      ? (existing.beatsReadJson as string[])
      : []
    if (!readKeys.includes(beatKey)) {
      await prisma.narrativeProgress.update({
        where: { id: existing.id },
        data: { beatsReadJson: [...readKeys, beatKey] },
      })
    }
  } else {
    await prisma.narrativeProgress.create({
      data: { studentId, unitId, beatsReadJson: [beatKey], skipAllNpcs: false },
    })
  }
}

export async function toggleSkipNpcs(studentId: string, skip: boolean): Promise<void> {
  // Update all existing narrative progress rows for the student
  await prisma.narrativeProgress.updateMany({
    where: { studentId },
    data: { skipAllNpcs: skip },
  })
  // Also store on the student's UI settings so it applies to new units too
  await prisma.studentUiSettings.upsert({
    where: { studentId },
    update: { skipAllNpcs: skip },
    create: { studentId, skipAllNpcs: skip },
  })
}
