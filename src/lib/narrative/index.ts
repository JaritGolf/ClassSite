
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
