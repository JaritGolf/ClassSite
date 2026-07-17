/**
 * Seed: L1 Term Translations (Phase 16, §36.17).
 *
 * Spanish ('es') glosses for ALL tier-3 civics terms + a small Haitian Creole
 * ('ht') proof sample. Spanish seeds APPROVED under the owner's directive
 * (ADR 0013 — see seed/approval_mode.ts); the owner reviews post-hoc in
 * /teacher/content. Haitian Creole remains NEEDS_REVIEW (proof sample pending
 * a language-proficient reviewer, per ADR 0010). Display stays gated to
 * APPROVED. Idempotent: upsert by [termId, languageCode].
 *
 * Keys below are the exact English term strings from seed/vocabulary.ts.
 */

import type { PrismaClient } from '@prisma/client'
import { CONTENT_APPROVAL } from './approval_mode'

// ── Spanish (es) — all 53 tier-3 terms ───────────────────────────────────────
const ES: Record<string, string> = {
  // Origins
  // ADR 0017: terms added for the realigned official 1.1/1.2/1.3 blocks.
  'direct democracy': 'Gobierno en el que los ciudadanos votan ellos mismos las leyes y decisiones, sin representantes; se practicaba en la antigua Atenas.',
  'civic virtue': 'Poner el bien de la comunidad por encima de los intereses personales; un ideal de la República romana que admiraban los fundadores estadounidenses.',
  'Twelve Tables': 'El primer código de leyes escritas de la antigua Roma (hacia 450 a.C.), exhibido públicamente para que todo ciudadano conociera la ley; un antecesor de las constituciones escritas.',
  'limited government': 'El principio de que el gobierno solo puede usar los poderes que el pueblo le ha otorgado, generalmente escritos en una constitución.',
  republicanism: 'El principio fundacional de que el pueblo gobierna a través de representantes que elige y a quienes puede pedir cuentas.',
  'Common Sense': 'El panfleto de Thomas Paine de 1776 que defendía en lenguaje sencillo la independencia estadounidense y el gobierno republicano; convenció a muchos colonos de apoyar la separación de Gran Bretaña.',
  republic: 'Forma de gobierno en la que los ciudadanos eligen representantes para gobernar en su nombre.',
  democracy: 'Sistema de gobierno en el que el poder pertenece al pueblo, ya sea directamente o a través de representantes electos.',
  'natural rights': 'Derechos con los que nacen todas las personas y que el gobierno no otorga; según Locke: vida, libertad y propiedad.',
  'social contract': 'La idea de que las personas ceden algunas libertades a un gobierno a cambio de la protección de sus demás derechos.',
  'rule of law': 'El principio de que todas las personas e instituciones, incluido el gobierno, deben obedecer la ley.',
  'popular sovereignty': 'La idea de que la autoridad política pertenece al pueblo, que se la otorga al gobierno.',
  'consent of the governed': 'El principio de que un gobierno obtiene su legitimidad del acuerdo y la aprobación del pueblo que gobierna.',
  Enlightenment: 'Movimiento intelectual del siglo XVIII que destacó la razón, los derechos individuales y el gobierno limitado, e influyó en la fundación de Estados Unidos.',
  'Magna Carta': 'Documento inglés de 1215 que limitó el poder del rey y estableció ciertos derechos; una influencia temprana en la democracia estadounidense.',
  'English Bill of Rights': 'Ley inglesa de 1689 que limitó el poder real y garantizó ciertos derechos al Parlamento y a los ciudadanos; influyó en los fundadores estadounidenses.',
  'Mayflower Compact': 'Acuerdo de 1620 entre los peregrinos para crear una comunidad autogobernada; un ejemplo temprano de autogobierno en América.',
  'Declaration of Independence': 'Documento de 1776 que declaró la independencia de las colonias de Gran Bretaña y estableció principios fundadores como los derechos naturales y el consentimiento de los gobernados.',
  'Articles of Confederation': 'El primer plan de gobierno de Estados Unidos (1781–1789); tenía debilidades importantes, como la falta de poder para cobrar impuestos o hacer cumplir las leyes.',
  Constitution: 'La ley suprema de Estados Unidos, que establece la estructura del gobierno y protege los derechos individuales.',
  Preamble: "La declaración introductoria de la Constitución de EE. UU. que comienza con 'Nosotros el Pueblo' y expresa los propósitos del documento.",
  ratification: 'El proceso de aprobar formalmente un documento o acuerdo, como un tratado o una enmienda constitucional.',
  grievance: 'Una queja formal; la Declaración de Independencia enumera quejas específicas contra el rey británico.',
  principle: 'Una verdad o regla fundamental que guía el pensamiento o la acción.',
  monarchy: 'Forma de gobierno en la que un solo gobernante (rey o reina) tiene el poder supremo, a menudo de forma hereditaria.',
  oligarchy: 'Forma de gobierno en la que un grupo pequeño de personas tiene todo el poder.',
  'town meeting': 'Reunión de Nueva Inglaterra en la que los miembros de la comunidad debatían y votaban directamente sobre asuntos locales; una forma temprana de democracia directa.',
  'common law': 'Derecho desarrollado con el tiempo a partir de las decisiones de los jueces y las costumbres, en lugar de leyes escritas; una tradición inglesa llevada a la América colonial.',
  'salutary neglect': 'La política británica de aplicar las leyes en las colonias de manera poco estricta, lo que permitió que se desarrollara el autogobierno colonial.',
  boycott: 'Una negativa organizada a comprar ciertos productos como forma de protesta; los colonos boicotearon los productos británicos para oponerse a los impuestos sin representación.',
  petition: 'Una solicitud formal por escrito dirigida a quienes tienen el poder; los colonos enviaron peticiones al rey y al Parlamento antes de recurrir a una resistencia más fuerte.',
  repeal: 'Cancelar oficialmente una ley; los boicots coloniales presionaron al Parlamento para derogar la Ley del Timbre en 1766.',
  'taxation without representation': 'Ser gravado con impuestos por un gobierno en el que no se tiene voz electa; la objeción principal de los colonos a los impuestos británicos después de 1763.',
  'unalienable rights': 'Derechos que no pueden quitarse ni cederse; la Declaración nombra la vida, la libertad y la búsqueda de la felicidad.',
  confederation: 'Una alianza flexible de estados independientes que conservan la mayor parte de su poder, con un gobierno central débil.',
  "Shays' Rebellion": 'Un levantamiento de agricultores de Massachusetts (1786–87) que expuso la incapacidad del gobierno nacional para mantener el orden bajo los Artículos de la Confederación.',
  Federalists: 'Partidarios de ratificar la Constitución, que favorecían un gobierno nacional más fuerte con controles y equilibrios.',
  'Anti-Federalists': 'Opositores a la ratificación de la Constitución, que temían el poder nacional y exigían una carta de derechos.',
  // Citizens
  citizen: 'Persona que pertenece legalmente a un país y tiene derechos y responsabilidades dentro de él.',
  naturalization: 'El proceso legal por el cual una persona que no es ciudadana se convierte en ciudadana de un país.',
  'civic responsibility': 'Una acción voluntaria que los ciudadanos realizan para beneficiar a su comunidad o país, como votar o ser voluntario.',
  'civic obligation': 'Un deber obligatorio de los ciudadanos que la ley exige, como pagar impuestos o servir en un jurado.',
  'due process': 'El principio de que el gobierno debe seguir los procedimientos legales establecidos antes de privar a una persona de su vida, libertad o propiedad.',
  'Bill of Rights': 'Las primeras diez enmiendas de la Constitución de EE. UU., que protegen las libertades individuales frente a la interferencia del gobierno.',
  suffrage: 'El derecho a votar en las elecciones políticas.',
  'double jeopardy': 'La protección legal que impide que una persona sea juzgada dos veces por el mismo delito después de haber sido absuelta.',
  'search and seizure': 'La protección de la 4.ª Enmienda que exige que las fuerzas del orden tengan una orden judicial o una excepción válida para registrar a una persona o propiedad.',
  // Policies
  'public policy': 'Un curso de acción o conjunto de reglas creadas por el gobierno para abordar un asunto o problema público.',
  'political party': 'Una organización de personas con creencias políticas compartidas que trabaja para elegir candidatos e influir en las políticas del gobierno.',
  'interest group': 'Una organización que intenta influir en las políticas del gobierno en favor de una causa o grupo de personas en particular.',
  lobbying: 'El acto de intentar persuadir a los funcionarios del gobierno para que apoyen ciertas leyes o políticas; una forma legal de defensa política.',
  propaganda: 'Información, a menudo engañosa o sesgada, que se usa para promover una causa o punto de vista político en particular.',
  bias: 'Una preferencia injusta a favor o en contra de algo; en los medios, presentar la información de una manera que favorece un punto de vista.',
  'civic engagement': 'Participación activa en la vida de la comunidad y en el proceso político, incluyendo votar, ser voluntario y la defensa de causas.',
  'primary election': 'Una elección dentro de un partido político para elegir a su candidato para una elección general.',
  'general election': 'Una elección en la que todos los votantes elegibles eligen entre candidatos de diferentes partidos para un cargo público.',
  'electoral college': 'El sistema establecido por la Constitución en el que electores de cada estado eligen formalmente al Presidente y al Vicepresidente.',
  // Organization
  federalism: 'Sistema de gobierno que divide el poder entre un gobierno nacional y los gobiernos estatales.',
  'separation of powers': 'La división de la autoridad del gobierno entre tres poderes (legislativo, ejecutivo y judicial) para evitar que uno solo tenga demasiado poder.',
  'checks and balances': 'Un sistema en el que cada poder del gobierno puede limitar el poder de los demás.',
  bicameral: 'Que tiene dos cámaras legislativas; el Congreso de EE. UU. es bicameral (Senado y Cámara de Representantes).',
  veto: 'El poder del Presidente de rechazar un proyecto de ley aprobado por el Congreso, impidiendo que se convierta en ley.',
  override: 'La capacidad del Congreso de convertir un proyecto de ley en ley a pesar de un veto presidencial, lo que requiere una votación de dos tercios en ambas cámaras.',
  impeach: 'Acusar formalmente a un funcionario del gobierno de mala conducta en el cargo; la Cámara de Representantes tiene ese poder.',
  'judicial review': 'El poder de los tribunales, especialmente la Corte Suprema, de determinar si una ley o acción del gobierno viola la Constitución.',
  'appellate court': 'Un tribunal que revisa las decisiones de tribunales inferiores; no realiza nuevos juicios, sino que examina si se cometieron errores legales.',
  'delegated powers': 'Poderes otorgados específicamente al gobierno federal por la Constitución (por ejemplo, acuñar dinero, declarar la guerra).',
  'reserved powers': 'Poderes que la Constitución no otorga al gobierno federal y que conservan los estados (10.ª Enmienda).',
  'concurrent powers': 'Poderes compartidos por los gobiernos federal y estatal (por ejemplo, cobrar impuestos, construir carreteras).',
  amendment: 'Un cambio o adición formal a la Constitución.',
  'supremacy clause': 'La disposición constitucional que establece que la Constitución y las leyes federales son la ley suprema del país.',
}

// ── Haitian Creole (ht) — proof sample (bulk content deferred) ───────────────
const HT: Record<string, string> = {
  democracy: 'Yon sistèm gouvènman kote pouvwa a nan men pèp la, swa dirèkteman oswa atravè reprezantan yo eli.',
  republic: 'Yon fòm gouvènman kote sitwayen yo eli reprezantan pou gouvène nan non yo.',
  citizen: 'Yon moun ki legalman fè pati yon peyi epi ki gen dwa ak responsablite ladan l.',
  'rule of law': 'Prensip ki di tout moun ak enstitisyon, ki gen ladan gouvènman an, dwe respekte lwa a.',
  'Bill of Rights': 'Dis premye amannman nan Konstitisyon Etazini an, ki pwoteje libète endividyèl yo kont entèferans gouvènman an.',
  federalism: 'Yon sistèm gouvènman ki divize pouvwa ant yon gouvènman nasyonal ak gouvènman eta yo.',
  amendment: 'Yon chanjman oswa ajou fòmèl nan Konstitisyon an.',
  suffrage: 'Dwa pou vote nan eleksyon politik yo.',
}

export async function seedTermTranslations(prisma: PrismaClient): Promise<void> {
  const tier3 = await prisma.term.findMany({
    where: { tier: 'TIER_3' },
    select: { id: true, term: true },
  })

  let esCount = 0
  let htCount = 0
  const missingEs: string[] = []

  for (const t of tier3) {
    const esDef = ES[t.term]
    if (esDef) {
      await prisma.termTranslation.upsert({
        where: { termId_languageCode: { termId: t.id, languageCode: 'es' } },
        create: {
          termId: t.id,
          languageCode: 'es',
          definitionTranslated: esDef,
          approvalStatus: CONTENT_APPROVAL.approvalStatus,
        },
        update: { definitionTranslated: esDef, approvalStatus: CONTENT_APPROVAL.approvalStatus },
      })
      esCount++
    } else {
      missingEs.push(t.term)
    }

    const htDef = HT[t.term]
    if (htDef) {
      await prisma.termTranslation.upsert({
        where: { termId_languageCode: { termId: t.id, languageCode: 'ht' } },
        create: { termId: t.id, languageCode: 'ht', definitionTranslated: htDef, approvalStatus: 'NEEDS_REVIEW' },
        update: { definitionTranslated: htDef },
      })
      htCount++
    }
  }

  if (missingEs.length > 0) {
    console.warn(`  ⚠ Missing Spanish gloss for tier-3 terms: ${missingEs.join(', ')}`)
  }
  console.log(
    `  ✓ Term translations seeded (es: ${esCount}/${tier3.length} tier-3 ${CONTENT_APPROVAL.approvalStatus} per ADR 0013; ht sample: ${htCount} NEEDS_REVIEW)`
  )
}
