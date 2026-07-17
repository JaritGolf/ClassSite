/**
 * Seed: Stimuli — Unit 1 Reading-Load Variants (Phase 7)
 *
 * Creates one Stimulus per Unit 1 benchmark with StimulusVariants at
 * reading-load levels 1, 2, and 3.
 *
 * Idempotent: stimulus found-or-created by title prefix. Variants upserted
 * by [stimulusId, readingLoadLevel] (unique index in schema).
 *
 * After creation, attaches the stimulus to 2-3 existing questions per
 * benchmark (the level-2 and level-3 questions are good candidates since
 * they have stimuli in a real deployment).
 *
 * Spec reference: Section 16 (Reading-Load Ladder)
 */

import { PrismaClient } from '@prisma/client'

interface StimulusDef {
  /** Unique stable title — used as the find-or-create key */
  title: string
  benchmarkCode: string
  source: string
  copyrightNotes: string
  /** Level 3: raw founding document passage — no scaffolding */
  level3: string
  /** Level 2: chunked excerpt — moderate stems, key terms glossed */
  level2: string
  /** Level 1: paraphrase — simplified language, glossary popovers */
  level1: string
  /** External keys of questions to attach stimulusId to */
  attachQuestionKeys: string[]
}

const STIMULI_DEFS: StimulusDef[] = [
  // ── SS.7.CG.1.1 — Enlightenment and European Influences ───────────────
  {
    title: '[SEED] John Locke — Natural Rights (SS.7.CG.1.1)',
    benchmarkCode: 'SS.7.CG.1.4', // ADR 0017: was 1.1 (label only — not persisted)
    source: 'John Locke, Two Treatises of Government, 1689 (public domain)',
    copyrightNotes: 'Public domain. No copyright restriction.',
    level3:
      'To understand political power right, and derive it from its original, we must consider, what state all men are naturally in, and that is, a state of perfect freedom to order their actions, and dispose of their possessions and persons, as they think fit, within the bounds of the law of nature, without asking leave, or depending upon the will of any other man. Men being, as has been said, by nature, all free, equal, and independent, no one can be put out of this estate, and subjected to the political power of another, without his own consent.',
    level2:
      'John Locke believed that all people are born free and equal. He wrote that no one can lose their freedom unless they agree to it. Locke said the purpose of government is to protect these natural rights — rights that belong to every person by nature, not given by rulers.\n\nLocke argued that if a government fails to protect people\'s rights, the people have the right to change or replace that government.',
    level1:
      'John Locke said that people are born with rights that no government can take away. These are called natural rights. He believed everyone is equal and free. A government\'s job is to protect those rights. If the government doesn\'t protect them, the people can change the government.',
    attachQuestionKeys: ['q-SS7CG11-007', 'q-SS7CG11-008', 'q-SS7CG11-009'],
  },

  // ── SS.7.CG.1.2 — Colonial and British Governmental Traditions ────────
  {
    title: '[SEED] Virginia House of Burgesses Charter (SS.7.CG.1.2)',
    benchmarkCode: 'SS.7.CG.1.3', // ADR 0017: was 1.2 (label only — not persisted)
    source:
      'Virginia Company Instructions to Governor Yeardley, 1619 (public domain)',
    copyrightNotes: 'Public domain. No copyright restriction.',
    level3:
      'And whereas in all other things, we require the said Governor and Council to imitate and follow the policy of the form of government, laws, customs, and manner of trial, and other administration of justice used in the realm of England, as near as may be, even as ourselves, by his Majesty\'s letters patent, are required. That the said Governor shall, as occasion requires, draw the Burgesses of all and singular plantations there to consult and advise with them for the better ordering and directing of all causes and matters whatsoever.',
    level2:
      'In 1619, Virginia created the House of Burgesses — the first elected assembly in the American colonies. Representatives called burgesses were chosen by the colonists to make local laws.\n\nThe House of Burgesses was important because it showed that colonists expected a say in their own government. This idea — that the people should choose their leaders — became a key principle of American democracy.',
    level1:
      'In 1619, Virginia started the first elected government in America. It was called the House of Burgesses. Colonists voted for people called burgesses to make their laws. This was the first time American colonists chose their own leaders. This idea became very important to American democracy.',
    attachQuestionKeys: ['q-SS7CG12-007', 'q-SS7CG12-008', 'q-SS7CG12-009'],
  },

  // ── SS.7.CG.1.3 — Causes of the American Revolution ──────────────────
  {
    title: '[SEED] Stamp Act Preamble (SS.7.CG.1.3)',
    benchmarkCode: 'SS.7.CG.1.5', // ADR 0017: was 1.3 (label only — not persisted)
    source: 'Stamp Act, British Parliament, 1765 (public domain)',
    copyrightNotes: 'Public domain. No copyright restriction.',
    level3:
      'Whereas by an act made in the last session of parliament, several duties were granted, continued, and appropriated, towards defraying the expences of defending, protecting, and securing, the British colonies and plantations in America: and whereas it is just and necessary, that provision be made for raising a further revenue within your Majesty\'s dominions in America, towards defraying the said expences: we, your Majesty\'s most dutiful and loyal subjects, the commons of Great Britain in parliament assembled, have therefore resolved to give and grant unto your Majesty the several rates and duties herein after mentioned.',
    level2:
      'In 1765, the British Parliament passed the Stamp Act. It placed a tax on paper goods in the colonies — newspapers, legal documents, and even playing cards.\n\nColonists were angry because they had no representatives in Parliament. They argued they could not be taxed without having a voice in the decision. Their protest slogan was "No taxation without representation."',
    level1:
      'In 1765, Britain made colonists pay a tax on paper and documents. This was called the Stamp Act. Colonists were angry because they had no say in making this tax. They said it was unfair to tax people who had no voice in government. They chanted "No taxation without representation."',
    attachQuestionKeys: ['q-SS7CG13-007', 'q-SS7CG13-008', 'q-SS7CG13-009'],
  },

  // ── SS.7.CG.1.4 — Declaration of Independence ────────────────────────
  {
    title: '[SEED] Declaration of Independence Preamble (SS.7.CG.1.4)',
    benchmarkCode: 'SS.7.CG.1.6', // ADR 0017: was 1.4 (label only — not persisted)
    source:
      'Declaration of Independence, Continental Congress, 1776 (public domain)',
    copyrightNotes: 'Public domain. No copyright restriction.',
    level3:
      'We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness. — That to secure these rights, Governments are instituted among Men, deriving their just powers from the consent of the governed, — That whenever any Form of Government becomes destructive of these ends, it is the Right of the People to alter or to abolish it, and to institute new Government, laying its foundation on such principles and organizing its powers in such form, as to them shall seem most likely to effect their Safety and Happiness.',
    level2:
      'The Declaration of Independence stated that all people are created equal and have certain rights that cannot be taken away. These include life, liberty, and the pursuit of happiness.\n\nIt also said that governments get their power from the consent of the governed — meaning the people. If a government fails to protect these rights, the people have the right to change or replace it.\n\nThese ideas came directly from Enlightenment philosophers like John Locke.',
    level1:
      'The Declaration of Independence said that all people are equal and have rights that no one can take away — like the right to life, freedom, and happiness. It also said that governments get their power from the people. If a government is unfair, the people can change it. These ideas came from thinkers like John Locke.',
    attachQuestionKeys: ['q-SS7CG14-007', 'q-SS7CG14-008', 'q-SS7CG14-009'],
  },

  // ── SS.7.CG.1.5 — Articles of Confederation ──────────────────────────
  {
    title: '[SEED] Articles of Confederation — State Sovereignty (SS.7.CG.1.5)',
    benchmarkCode: 'SS.7.CG.1.7', // ADR 0017: was 1.5 (label only — not persisted)
    source: 'Articles of Confederation, Article II, 1781 (public domain)',
    copyrightNotes: 'Public domain. No copyright restriction.',
    level3:
      'Article II. Each state retains its sovereignty, freedom, and independence, and every power, jurisdiction, and right, which is not by this Confederation expressly delegated to the United States, in Congress assembled.',
    level2:
      'Under the Articles of Confederation (1781), each state kept most of its power. The national government was very weak — it could not collect taxes, could not force states to follow its laws, and had no president or courts.\n\nBecause states acted almost like separate countries, the new nation had serious problems: it couldn\'t pay its war debts, defend its borders, or enforce trade agreements.',
    level1:
      'The Articles of Confederation was America\'s first plan of government after independence. It gave most power to the states. The national government was very weak — it had no president, could not collect taxes, and could not make states follow rules. This caused big problems for the new country.',
    attachQuestionKeys: ['q-SS7CG15-007', 'q-SS7CG15-008', 'q-SS7CG15-009'],
  },

  // ── SS.7.CG.1.6 — U.S. Constitution ─────────────────────────────────
  {
    title: '[SEED] U.S. Constitution — Preamble (SS.7.CG.1.6)',
    benchmarkCode: 'SS.7.CG.1.8', // ADR 0017: was 1.6 (label only; attached questions split to 1.7/1.10)
    source: 'U.S. Constitution, Preamble, 1787 (public domain)',
    copyrightNotes: 'Public domain. No copyright restriction.',
    level3:
      'We the People of the United States, in Order to form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defence, promote the general Welfare, and secure the Blessings of Liberty to ourselves and our Posterity, do ordain and establish this Constitution for the United States of America.',
    level2:
      'The Preamble is the introduction to the U.S. Constitution. It lists the six goals of the government:\n1. Form a more perfect union\n2. Establish justice\n3. Ensure peace at home\n4. Provide for the nation\'s defense\n5. Promote the general welfare\n6. Secure liberty for future generations\n\nThe phrase "We the People" shows that power comes from the citizens — a key idea of popular sovereignty.',
    level1:
      'The Preamble is the beginning of the Constitution. It explains why the Constitution was written. It lists six goals — like fairness, peace, and protecting freedom. The words "We the People" show that the government gets its power from the citizens, not from a king.',
    attachQuestionKeys: ['q-SS7CG16-007', 'q-SS7CG16-008', 'q-SS7CG16-009'],
  },
]

// ── Main seed function ─────────────────────────────────────────────────────

export async function seedStimuliUnit1(prisma: PrismaClient): Promise<void> {
  for (const def of STIMULI_DEFS) {
    // ── Find or create Stimulus ──────────────────────────────────────────
    let stimulus = await prisma.stimulus.findFirst({
      where: { title: def.title },
      select: { id: true },
    })

    if (!stimulus) {
      stimulus = await prisma.stimulus.create({
        data: {
          title: def.title,
          stimulusType: 'EXCERPT',
          content: def.level3, // base content = level 3 (raw)
          readingLoadLevel: 3,
          source: def.source,
          copyrightNotes: def.copyrightNotes,
          approvalStatus: 'APPROVED',
        },
        select: { id: true },
      })
    }

    // ── Upsert StimulusVariants for levels 1 and 2 ──────────────────────
    // Level 3 = base content on the Stimulus itself; levels 1 and 2 = variants

    const variants: { level: number; content: string }[] = [
      { level: 1, content: def.level1 },
      { level: 2, content: def.level2 },
    ]

    for (const variant of variants) {
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

    // ── Attach stimulus to existing questions ────────────────────────────
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

  // Note: Accommodation records (ACC-SIMPLE-LANG, ELL, BELOW-GRADE-READER)
  // are seeded by seedBenchmarks() in seed/benchmarks.ts — not duplicated here.
}
