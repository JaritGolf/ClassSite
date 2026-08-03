/**
 * Seed: Visual Stimuli — Canva-generated EOC-style graphics (ADR 0018 pilot).
 *
 * Three visual stimuli (TIMELINE / CHART / FLOWCHART) generated with the
 * owner's Canva connector, reviewed + fact-checked, exported to
 * public/stimuli/ (attribution manifest: public/stimuli/attributions.json).
 * These fill the previously-empty non-EXCERPT Source Sprint pools and give
 * the "performance by stimulus type" analytics dimension real data.
 *
 * Accessibility contract: the level-1/2/3 TEXT VARIANTS are the accessible
 * equivalent of each visual — they express the same content at each reading
 * load, and feed read-aloud/chunking/glossary exactly like text stimuli.
 * The image is display-layer only; grading never depends on it (rule #1/#2
 * untouched — stimuli carry no answer data).
 *
 * Rule #9: assets are committed under public/ and served same-origin — no
 * student request ever leaves the app.
 *
 * Idempotent: stimulus found by title (create-or-UPDATE — unlike the legacy
 * unit-1 stimuli, edits here propagate on re-seed); variants upserted by
 * [stimulusId, readingLoadLevel]; question attachment only fills empty
 * stimulusId slots (never steals an existing attachment).
 */

import type { PrismaClient, StimulusType } from '@prisma/client'

interface VisualStimulusDef {
  /** Unique stable title — the find key. */
  title: string
  /** Documentation only (Stimulus has no benchmark FK). */
  benchmarkCode: string
  stimulusType: StimulusType
  /** Same-origin path under public/. */
  mediaUrl: string
  source: string
  copyrightNotes: string
  /** Level 3: full-detail text equivalent (base content). */
  level3: string
  /** Level 2: chunked, EOC-equivalent text. */
  level2: string
  /** Level 1: simplified paraphrase. */
  level1: string
  /** externalKeys of questions to attach to (only where stimulusId is null). */
  attachQuestionKeys: string[]
}

const VISUAL_STIMULI: VisualStimulusDef[] = [
  // ── SS.7.CG.1.7 — TIMELINE: Articles → Constitution ────────────────────────
  {
    title: '[SEED] Timeline: From the Articles to the Constitution (SS.7.CG.1.7)',
    benchmarkCode: 'SS.7.CG.1.7',
    stimulusType: 'TIMELINE',
    mediaUrl: '/stimuli/articles-to-constitution-timeline.png',
    source:
      'My Civics Class classroom graphic, created with Canva (2026). Content reviewed against benchmark SS.7.CG.1.7.',
    copyrightNotes:
      'Owner-generated via Canva AI design tools under the Canva Content License; educational classroom use. See public/stimuli/attributions.json.',
    level3:
      'The timeline presents six events. 1781: the Articles of Confederation take effect, creating a weak national government with no power to tax, no president, and no national courts. 1786–87: Shays\' Rebellion, a farmers\' uprising in Massachusetts, shows the government cannot keep order. May 1787: the Constitutional Convention meets in Philadelphia, where 55 delegates decide to replace the Articles. September 1787: the Constitution is signed, establishing a stronger national government with three branches and the power to tax. June 1788: New Hampshire becomes the ninth state to ratify, and the Constitution takes effect. 1791: the Bill of Rights is added, keeping a promise made to the Anti-Federalists.',
    level2:
      'The timeline shows six events in order.\n\n1781 — The Articles of Confederation take effect. The national government is weak: it cannot tax, has no president, and has no national courts.\n\n1786–87 — Shays\' Rebellion. A farmers\' uprising in Massachusetts shows the government cannot keep order.\n\nMay 1787 — The Constitutional Convention. 55 delegates meet in Philadelphia and decide to replace the Articles.\n\nSeptember 1787 — The Constitution is signed. It creates a stronger national government with three branches and the power to tax.\n\nJune 1788 — Nine states have ratified. New Hampshire is the ninth state, so the Constitution takes effect.\n\n1791 — The Bill of Rights is added, keeping a promise made to the Anti-Federalists.',
    level1:
      'The timeline shows six events.\n\n1781 — America\'s first plan of government, the Articles of Confederation, begins. It is very weak.\n\n1786–87 — Angry farmers in Massachusetts start Shays\' Rebellion. The weak government cannot stop it.\n\nMay 1787 — Leaders meet in Philadelphia. They decide to write a new plan.\n\nSeptember 1787 — The new plan, the Constitution, is signed. It makes a stronger government.\n\nJune 1788 — Nine states say yes. The Constitution becomes the law.\n\n1791 — The Bill of Rights is added to protect people\'s freedoms.',
    attachQuestionKeys: ['q-SS7CG16-028', 'q-SS7CG16-029', 'q-SS7CG16-030'],
  },

  // ── SS.7.CG.1.8 — CHART: The Preamble's six purposes ───────────────────────
  {
    title: '[SEED] Chart: The Preamble — Six Purposes of Government (SS.7.CG.1.8)',
    benchmarkCode: 'SS.7.CG.1.8',
    stimulusType: 'CHART',
    mediaUrl: '/stimuli/preamble-six-purposes-chart.png',
    source:
      'My Civics Class classroom graphic, created with Canva (2026). Preamble text: U.S. Constitution, 1787 (public domain).',
    copyrightNotes:
      'Owner-generated via Canva AI design tools under the Canva Content License; educational classroom use. See public/stimuli/attributions.json.',
    level3:
      'The chart pairs each phrase of the Preamble to the U.S. Constitution (1787) with its meaning. "Form a more perfect Union" — join the states as one working nation. "Establish Justice" — create fair laws and fair courts. "Insure domestic Tranquility" — keep peace and order at home. "Provide for the common defence" — protect the nation from attack. "Promote the general Welfare" — help people live healthy, decent lives. "Secure the Blessings of Liberty" — protect freedom for future generations. The chart notes that the Preamble was written in 1787 and lists six purposes of government.',
    level2:
      'The chart lists the six purposes of government from the Preamble, each with its meaning.\n\n1. "Form a more perfect Union" — join the states as one working nation.\n2. "Establish Justice" — create fair laws and fair courts.\n3. "Insure domestic Tranquility" — keep peace and order at home.\n4. "Provide for the common defence" — protect the nation from attack.\n5. "Promote the general Welfare" — help people live healthy, decent lives.\n6. "Secure the Blessings of Liberty" — protect freedom for future generations.',
    level1:
      'The chart shows the six jobs the Constitution gives the government.\n\n1. Bring the states together as one nation.\n2. Make fair laws and courts.\n3. Keep peace inside the country.\n4. Protect the country from attack.\n5. Help people live good lives.\n6. Protect freedom now and in the future.',
    attachQuestionKeys: ['q-SS7CG17-021', 'q-SS7CG17-022', 'q-SS7CG17-023'],
  },

  // ── SS.7.CG.1.10 — FLOWCHART: The path to ratification ─────────────────────
  {
    title: '[SEED] Flowchart: The Road to Ratification (SS.7.CG.1.10)',
    benchmarkCode: 'SS.7.CG.1.10',
    stimulusType: 'FLOWCHART',
    mediaUrl: '/stimuli/ratification-path-flowchart.png',
    source:
      'My Civics Class classroom graphic, created with Canva (2026). Content reviewed against benchmark SS.7.CG.1.10.',
    copyrightNotes:
      'Owner-generated via Canva AI design tools under the Canva Content License; educational classroom use. See public/stimuli/attributions.json.',
    level3:
      'The graphic presents the path to ratification, 1787–1791, as a five-step sequence. Step 1: in September 1787 the Constitution is signed and sent to the states for approval. Step 2: the Federalists support ratification, arguing the nation needs a stronger national government, and write The Federalist Papers. Step 3: the Anti-Federalists oppose it, fearing too much central power and objecting that there is no bill of rights. Step 4: in the compromise, Federalists promise to add a bill of rights after ratification. Step 5: in June 1788 New Hampshire becomes the ninth state to ratify and the Constitution takes effect. The graphic also notes that nine states were needed and that the first ten amendments became the Bill of Rights.',
    level2:
      'The graphic shows the path to ratification in five steps.\n\nStep 1 — September 1787: the Constitution is signed and sent to the states for approval.\n\nStep 2 — Federalists support ratification. They argue the nation needs a stronger national government, and they write The Federalist Papers.\n\nStep 3 — Anti-Federalists oppose it. They fear too much central power, and there is no bill of rights.\n\nStep 4 — The compromise: Federalists promise to add a bill of rights after ratification.\n\nStep 5 — June 1788: New Hampshire is the ninth state to ratify. The Constitution takes effect.',
    level1:
      'The graphic shows five steps.\n\nStep 1 — In 1787, the new Constitution is sent to the states for a vote.\n\nStep 2 — Federalists say YES. They want a stronger national government.\n\nStep 3 — Anti-Federalists say NO. They fear too much power and want a bill of rights.\n\nStep 4 — The deal: add a bill of rights after the vote.\n\nStep 5 — In 1788, nine states say yes. The Constitution wins.',
    attachQuestionKeys: ['q-SS7CG16-010', 'q-SS7CG16-011', 'q-SS7CG16-015'],
  },
]

export { VISUAL_STIMULI }

export async function seedVisualStimuli(prisma: PrismaClient): Promise<void> {
  let created = 0
  let updated = 0
  for (const def of VISUAL_STIMULI) {
    let stimulus = await prisma.stimulus.findFirst({
      where: { title: def.title },
      select: { id: true },
    })

    const data = {
      stimulusType: def.stimulusType,
      content: def.level3,
      readingLoadLevel: 3,
      mediaUrl: def.mediaUrl,
      source: def.source,
      copyrightNotes: def.copyrightNotes,
      approvalStatus: 'APPROVED' as const,
    }

    if (!stimulus) {
      stimulus = await prisma.stimulus.create({
        data: { title: def.title, ...data },
        select: { id: true },
      })
      created++
    } else {
      await prisma.stimulus.update({ where: { id: stimulus.id }, data })
      updated++
    }

    for (const variant of [
      { level: 1, content: def.level1 },
      { level: 2, content: def.level2 },
    ]) {
      await prisma.stimulusVariant.upsert({
        where: {
          stimulusId_readingLoadLevel: {
            stimulusId: stimulus.id,
            readingLoadLevel: variant.level,
          },
        },
        create: {
          stimulusId: stimulus.id,
          readingLoadLevel: variant.level,
          content: variant.content,
          approvalStatus: 'APPROVED',
        },
        update: {
          content: variant.content,
          approvalStatus: 'APPROVED',
        },
      })
    }

    for (const externalKey of def.attachQuestionKeys) {
      const question = await prisma.question.findUnique({
        where: { externalKey },
        select: { id: true, stimulusId: true },
      })
      if (question && !question.stimulusId) {
        await prisma.question.update({
          where: { id: question.id },
          data: { stimulusId: stimulus.id },
        })
      }
    }
  }

  console.log(
    `  ✓ Visual stimuli seeded (${created} created, ${updated} updated — TIMELINE/CHART/FLOWCHART pilot, ADR 0018)`
  )
}
