/**
 * NO STUDENT DATA — static guards.
 *
 * This build exists so the server never receives or stores anything about a
 * student. These tests are the tripwires that keep it that way. They are pure
 * filesystem scans (no database, no rendering), modelled on the audit17/04
 * no-analytics guard, and they fail loudly if:
 *
 *   1. a student-linked model or field reappears in prisma/schema.prisma
 *   2. a student-facing API route reads a session or performs a Prisma write
 *   3. a student page reads a session or sets a cookie
 *
 * "Performs" and "reads" are checked TRANSITIVELY: each student page and
 * student-facing route is followed through every local import it makes, so a
 * write hidden in a helper three files away is still caught.
 *
 * If one of these fails, the fix is almost never to edit the test. Adding a
 * model to the allowlist, or a route to the public list, is a decision about
 * student privacy — make it on purpose and say so in the pull request.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { dirname, join, relative, resolve } from 'path'

const ROOT = join(__dirname, '../../..')
const SRC = join(ROOT, 'src')
const rel = (file: string) => relative(ROOT, file)

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.(ts|tsx)$/.test(entry) ? [full] : []
  })
}

/** Source with comments removed, so prose about "cookies" never trips a scan. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
}

function resolveImport(from: string, spec: string): string | null {
  let base: string
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec)
  else return null // a package
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

/** Every local file reachable from `entries` through runtime imports. */
function closure(entries: string[]): string[] {
  const seen = new Set<string>()
  const queue = [...entries]
  while (queue.length > 0) {
    const file = queue.pop()!
    if (seen.has(file)) continue
    seen.add(file)
    const source = code(file)
    const specs = [
      ...source.matchAll(/(?:import|export)\s+(?!type\s)[^'"`;]*?from\s+['"]([^'"]+)['"]/g),
      ...source.matchAll(/import\s+['"]([^'"]+)['"]/g),
      ...source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
      ...source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((m) => m[1])
    for (const spec of specs) {
      const target = resolveImport(file, spec)
      if (target) queue.push(target)
    }
  }
  return [...seen]
}

// ── What counts as what ─────────────────────────────────────────────────────

/** Route handlers that are for STAFF and must check a session. */
const STAFF_ROUTE_PREFIXES = ['src/app/api/teacher/', 'src/app/api/admin/', 'src/app/api/lessons/media/']

/** Public routes that are neither staff nor student-facing. */
const INFRA_ROUTES = [
  'src/app/api/auth/[...nextauth]/route.ts', // next-auth itself (teacher sign-in)
  'src/app/api/health/route.ts',
  'src/app/media/uploads/[id]/route.ts', // serves teacher-uploaded lesson images
]

/**
 * The student-facing API, in full. A new student route must be added here
 * deliberately — and then it is held to every rule below.
 */
const STUDENT_ROUTES = [
  'src/app/api/assessment/[assessmentId]/start/route.ts',
  'src/app/api/assessment/[assessmentId]/submit/route.ts',
  'src/app/api/drill/items/route.ts',
  'src/app/api/practice/answer/route.ts',
  'src/app/api/practice/next-item/route.ts',
  'src/app/api/republic-challenge/start/route.ts',
  'src/app/api/republic-challenge/submit/route.ts',
  'src/app/api/strategy/[missionCode]/attempt/route.ts',
]

const allRoutes = walk(join(SRC, 'app'))
  .filter((f) => /\/route\.tsx?$/.test(f))
  .map(rel)
  .sort()

const studentRouteFiles = STUDENT_ROUTES.map((r) => join(ROOT, r))
const studentPageFiles = walk(join(SRC, 'app/student'))

// ── Patterns ────────────────────────────────────────────────────────────────

const SESSION_READS: [string, RegExp][] = [
  ['next-auth import', /from\s+['"]next-auth[^'"]*['"]/],
  ['auth module import', /from\s+['"]@\/lib\/auth(\/[^'"]*)?['"]/],
  ['getSession()', /\bgetSession\s*\(/],
  ['getServerSession()', /\bgetServerSession\s*\(/],
  ['requireAuth()', /\brequireAuth\s*\(/],
  ['useSession()', /\buseSession\s*\(/],
  ['SessionProvider', /\bSessionProvider\b/],
  ['getToken()', /\bgetToken\s*\(/],
]

const COOKIE_USE: [string, RegExp][] = [
  ['cookies() from next/headers', /\bcookies\s*\(\s*\)/],
  ['next/headers import', /from\s+['"]next\/headers['"]/],
  ['document.cookie', /document\s*\.\s*cookie/],
  ['Set-Cookie header', /set-cookie/i],
  ['response.cookies', /\.cookies\s*\.\s*(set|delete)\s*\(/],
  ['cookieStore', /\bcookieStore\b/],
]

const PRISMA_WRITES: [string, RegExp][] = [
  ['.create()', /\.\s*create\s*\(/],
  ['.createMany()', /\.\s*createMany\s*\(/],
  ['.update()', /\.\s*update\s*\(\s*\{/],
  ['.updateMany()', /\.\s*updateMany\s*\(/],
  ['.upsert()', /\.\s*upsert\s*\(/],
  ['.delete()', /\.\s*delete\s*\(\s*\{/],
  ['.deleteMany()', /\.\s*deleteMany\s*\(/],
  ['$executeRaw', /\$executeRaw/],
  ['$transaction', /\$transaction/],
  ['$queryRawUnsafe', /\$queryRawUnsafe/],
]

function findAll(files: string[], patterns: [string, RegExp][]): string[] {
  const hits: string[] = []
  for (const file of files) {
    const source = code(file)
    for (const [label, pattern] of patterns) {
      if (pattern.test(source)) hits.push(`${rel(file)} :: ${label}`)
    }
  }
  return hits
}

/** Files that talk to the database at all (import the Prisma client module). */
function touchesDatabase(file: string): boolean {
  return /from\s+['"]@\/lib\/db['"]|from\s+['"]@prisma\/client['"]/.test(code(file))
}

// ── 1. Schema ───────────────────────────────────────────────────────────────

describe('prisma/schema.prisma holds curriculum and the teacher account only', () => {
  const schema = readFileSync(join(ROOT, 'prisma/schema.prisma'), 'utf8')
  const withoutComments = schema.replace(/\/\/[^\n]*/g, '')
  const models = [...withoutComments.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map((m) => ({
    name: m[1],
    fields: m[2]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('@@'))
      .map((l) => ({ name: l.split(/\s+/)[0], type: l.split(/\s+/)[1] ?? '' })),
  }))

  /** Every model allowed to exist. Adding one is a deliberate privacy decision. */
  const ALLOWED_MODELS = [
    'Assessment',
    'AssessmentQuestion',
    'AuditLog',
    'Badge',
    'Benchmark',
    'BenchmarkClarification',
    'BenchmarkConnection',
    'Class',
    'ClassLessonOutline',
    'ClassLessonStep',
    'ClassLessonStepVisibility',
    'Lesson',
    'LessonStep',
    'Misconception',
    'Question',
    'QuestionOption',
    'RemediationItem',
    'ReportingCategory',
    'Resource',
    'Stimulus',
    'StimulusVariant',
    'Teacher',
    'Term',
    'TermTranslation',
    'Unit',
    'UploadedLessonImage',
    'User',
  ]

  it('contains exactly the allowlisted models', () => {
    expect(models.map((m) => m.name).sort()).toEqual(ALLOWED_MODELS)
  })

  it('has no model named for a student, parent, attempt, progress or accommodation', () => {
    const forbidden =
      /student|pupil|learner|parent|guardian|famil|enroll|roster|attempt|response|progress|remediation(?!Item)|accommodat|override|streak|activit|session|suggestion|spaced|review|calibration|readiness|badge(?!$)|score|checkpoint|narrative|uisetting/i
    expect(models.map((m) => m.name).filter((n) => forbidden.test(n))).toEqual([])
  })

  it('has no student-linked field on any model', () => {
    // Two curriculum fields legitimately contain the word "student".
    const allowed = new Set(['Benchmark.readyForStudents', 'Lesson.studentFriendlyTarget'])
    const forbidden =
      /student|pupil|parent|guardian|clever|enroll|accommodat|iep|eseStatus|ellStatus|l1Language|readingLevelFlag|districtStudent|gradeLevel|attempt|masteryScore|masteredAt|deviceId|ipAddress|userAgent|dateOfBirth|birth|nickname|classCode/i
    const offenders = models.flatMap((m) =>
      m.fields
        .filter((f) => forbidden.test(f.name) || forbidden.test(f.type))
        .map((f) => `${m.name}.${f.name}`)
        .filter((id) => !allowed.has(id))
    )
    expect(offenders).toEqual([])
  })

  it('the User model is a staff account — these fields and no others', () => {
    const user = models.find((m) => m.name === 'User')!
    expect(user.fields.map((f) => f.name).sort()).toEqual([
      'auditLogs',
      'createdAt',
      'email',
      'firstName',
      'googleId',
      'id',
      'lastName',
      'role',
      'status',
      'teacher',
      'updatedAt',
    ])
  })

  it('the only roles are TEACHER and ADMIN', () => {
    const role = /enum\s+UserRole\s*\{([\s\S]*?)\}/.exec(withoutComments)![1]
    expect(role.split('\n').map((l) => l.trim()).filter(Boolean)).toEqual(['TEACHER', 'ADMIN'])
  })

  it('a class has no roster relation', () => {
    const klass = models.find((m) => m.name === 'Class')!
    expect(klass.fields.map((f) => f.name).filter((n) => /enroll|student|roster|member/i.test(n))).toEqual([])
  })

  it('no SQL migration after the drop re-creates a student table', () => {
    const dir = join(ROOT, 'prisma/migrations')
    const after = readdirSync(dir)
      .filter((d) => /^\d{14}_/.test(d) && d > '20261116120000_no_student_data')
      .map((d) => readFileSync(join(dir, d, 'migration.sql'), 'utf8'))
      .join('\n')
    expect(after).not.toMatch(/CREATE TABLE "(students|parents|[a-z_]*student[a-z_]*|[a-z_]*attempt[a-z_]*)"/i)
  })
})

// ── 2. Routes ───────────────────────────────────────────────────────────────

describe('every API route is accounted for', () => {
  it('each route is staff, infrastructure, or on the student list', () => {
    const unaccounted = allRoutes.filter(
      (r) =>
        !STAFF_ROUTE_PREFIXES.some((p) => r.startsWith(p)) &&
        !INFRA_ROUTES.includes(r) &&
        !STUDENT_ROUTES.includes(r)
    )
    expect(unaccounted).toEqual([])
  })

  it('the student list names only routes that exist', () => {
    expect(STUDENT_ROUTES.filter((r) => !allRoutes.includes(r))).toEqual([])
  })

  it('every staff route checks a session', () => {
    const staff = allRoutes.filter((r) => STAFF_ROUTE_PREFIXES.some((p) => r.startsWith(p)))
    expect(staff.length).toBeGreaterThan(10)
    const unguarded = staff.filter(
      (r) => !/\b(getSession|requireAuth|requireAdmin)\s*\(/.test(code(join(ROOT, r)))
    )
    expect(unguarded).toEqual([])
  })
})

describe('student-facing API routes are anonymous and write nothing', () => {
  const reachable = closure(studentRouteFiles)

  it('follows imports far enough to mean something', () => {
    expect(reachable.length).toBeGreaterThan(15)
    expect(reachable.map(rel)).toContain('src/lib/assessment/stateless.ts')
  })

  it('no student route, or anything it imports, reads a session', () => {
    expect(findAll(reachable, SESSION_READS)).toEqual([])
  })

  it('no student route, or anything it imports, reads or sets a cookie', () => {
    expect(findAll(reachable, COOKIE_USE)).toEqual([])
  })

  it('no student route, or anything it imports, performs a Prisma write', () => {
    expect(findAll(reachable.filter(touchesDatabase), PRISMA_WRITES)).toEqual([])
  })

  it('student routes are POST-only handlers with no GET that could be cached or logged with a query', () => {
    for (const file of studentRouteFiles) {
      const exported = [...code(file).matchAll(/export\s+async\s+function\s+(\w+)/g)].map((m) => m[1])
      expect({ file: rel(file), exported }).toEqual({ file: rel(file), exported: ['POST'] })
    }
  })

  it('no student request schema has a field that could identify a student', () => {
    const identifying =
      /\b(studentId|userId|studentName|firstName|lastName|fullName|name|email|nickname|classCode|classId|deviceId|sessionId|attemptId|period|teacherName)\s*:\s*z\./
    const offenders = reachable.filter((f) => identifying.test(code(f))).map(rel)
    expect(offenders).toEqual([])
  })

  it('no student route reads the client IP or user agent', () => {
    const offenders = findAll(studentRouteFiles, [
      ['headers()', /\bheaders\s*\(\s*\)/],
      ['req.headers', /\breq(uest)?\s*\.\s*headers\b/],
      ['req.ip', /\breq(uest)?\s*\.\s*ip\b/],
      ['x-forwarded-for', /x-forwarded-for|user-agent/i],
    ])
    expect(offenders).toEqual([])
  })
})

// ── 3. Pages ────────────────────────────────────────────────────────────────

describe('student pages are anonymous and set no cookie', () => {
  const reachable = closure(studentPageFiles)

  it('finds the student pages and their components', () => {
    expect(studentPageFiles.length).toBeGreaterThan(10)
    expect(reachable.map(rel)).toContain('src/components/student/shell/StudentShell.tsx')
    expect(reachable.map(rel)).toContain('src/lib/local-progress/store.ts')
  })

  it('no student page, or anything it imports, reads a session', () => {
    expect(findAll(reachable, SESSION_READS)).toEqual([])
  })

  it('no student page, or anything it imports, reads or sets a cookie', () => {
    expect(findAll(reachable, COOKIE_USE)).toEqual([])
  })

  it('no student page, or anything it imports, performs a Prisma write', () => {
    expect(findAll(reachable.filter(touchesDatabase), PRISMA_WRITES)).toEqual([])
  })

  it('the root layout wraps nothing in a session provider', () => {
    const layout = code(join(SRC, 'app/layout.tsx'))
    expect(layout).not.toMatch(/SessionProvider|Providers|next-auth/)
  })

  it('middleware never runs on /student, so it cannot set a cookie there', () => {
    const middleware = code(join(SRC, 'middleware.ts'))
    const matcher = middleware.slice(middleware.indexOf('matcher'))
    expect(matcher).not.toMatch(/student/)
  })

  it('student code only calls the student API', () => {
    const allowed = [
      /^\/api\/assessment\/\$\{[^}]+\}\/(start|submit)$/,
      /^\/api\/drill\/items$/,
      /^\/api\/practice\/(answer|next-item)$/,
      /^\/api\/republic-challenge\/(start|submit)$/,
      /^\/api\/strategy\/\$\{[^}]+\}\/attempt$/,
    ]
    const offenders: string[] = []
    for (const file of reachable) {
      for (const m of code(file).matchAll(/fetch\(\s*[`'"]([^`'"]+)[`'"]/g)) {
        if (!allowed.some((re) => re.test(m[1]))) offenders.push(`${rel(file)} :: ${m[1]}`)
      }
      // A fetch whose URL is not a literal cannot be checked — do not allow one.
      for (const m of code(file).matchAll(/fetch\(\s*([A-Za-z_][\w.]*)\s*[,)]/g)) {
        offenders.push(`${rel(file)} :: fetch(${m[1]})`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('nothing in the student tree asks for a name', () => {
    const offenders = reachable
      .filter((f) => /\.tsx$/.test(f))
      .filter((f) =>
        /<input[^>]*(name|id|placeholder|autoComplete)=["'][^"']*(name|email|student\s?id)[^"']*["']/i.test(
          code(f)
        )
      )
      .map(rel)
    expect(offenders).toEqual([])
  })
})

// ── 4. The device store, and things that must stay deleted ─────────────────

describe('device-local progress never leaves the device', () => {
  const files = walk(join(SRC, 'lib/local-progress'))

  it('makes no network request and touches no cookie', () => {
    expect(
      findAll(files, [
        ['fetch()', /\bfetch\s*\(/],
        ['XMLHttpRequest', /XMLHttpRequest/],
        ['sendBeacon', /sendBeacon/],
        ['WebSocket', /WebSocket/],
        ...COOKIE_USE,
      ])
    ).toEqual([])
  })

  it('does not import the database or the auth module', () => {
    const offenders = closure(files).filter((f) =>
      /from\s+['"]@\/lib\/(db|auth)[^'"]*['"]|@prisma\/client/.test(
        code(f).replace(/import\s+type[^;\n]*/g, '')
      )
    )
    expect(offenders.map(rel)).toEqual([])
  })

  it('the stored shape has no place to put a name or an identifier', () => {
    const types = code(join(SRC, 'lib/local-progress/types.ts'))
    expect(types).not.toMatch(/\b(name|firstName|lastName|email|studentId|userId|deviceId|classCode)\s*[?:]/)
  })
})

describe('removed features stay removed', () => {
  it.each([
    'src/app/parent',
    'src/app/api/student',
    'src/app/api/suggestions',
    'src/app/api/mastery',
    'src/app/api/reading-load',
    'src/app/api/remediation',
    'src/app/api/narrative',
    'src/app/api/streak',
    'src/app/api/mission',
    'src/app/api/source-decoder',
    'src/app/api/teacher/students',
    'src/app/api/teacher/reports',
    'src/app/api/teacher/activity',
    'src/app/api/admin/eoc-scores',
    'src/app/api/admin/parents',
    'src/app/api/admin/retention',
    'src/app/teacher/students',
    'src/app/teacher/reports',
    'src/app/admin/parents',
    'src/app/admin/eoc-scores',
    'src/app/admin/retention',
    'src/components/student/layout/ActivityHeartbeat.tsx',
    'src/components/ui/SuggestionBox.tsx',
    'src/components/Providers.tsx',
    'src/lib/auth/providers/clever.ts',
    'src/lib/auth/demo-mode.ts',
    'src/lib/parent-portal',
    'src/lib/accommodations',
    'src/lib/activity-sessions',
    'src/lib/assessment-integrity',
    'src/lib/suggestions',
    'src/lib/retention',
    'src/lib/student-profile',
    'src/lib/daily-report',
    'seed/demo',
  ])('%s does not exist', (path) => {
    expect(existsSync(join(ROOT, path))).toBe(false)
  })

  it('the Prisma client is never asked for a student table anywhere in the codebase', () => {
    const tables =
      /\b(prisma|tx)\s*\.\s*(student\w*|parent\w*|classEnrollment|assessmentAttempt|attemptResponse|attemptIntegrityEvent|adaptiveSessionState|spacedReview\w+|confidenceCalibrationSnapshot|sourceDecoderProgress|strategyTrackProgress|eocReadinessSnapshot|classReadinessSnapshot|eocActualScore|eocCalibrationRun|accommodation|teacherOverride|streakState|narrativeProgress|suggestion|progressPlan|progressCheckpoint\w*)\b/
    const files = [...walk(SRC), ...walk(join(ROOT, 'seed')), ...walk(join(ROOT, 'scripts'))]
    expect(files.filter((f) => tables.test(code(f))).map(rel)).toEqual([])
  })
})
