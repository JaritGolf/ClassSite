'use client'

/**
 * ParentManager — admin UI to provision parent accounts and manage links
 * (Phase 18). Create a parent, link to a student (PENDING), and verify/reject.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

interface ParentLink {
  linkId: string
  studentId: string
  studentName: string
  relationship: string
  verifiedStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
}
interface Parent {
  parentId: string
  email: string | null
  displayName: string
  links: ParentLink[]
}
interface StudentOption {
  id: string
  name: string
}

const STATUS_STYLE: Record<string, string> = {
  VERIFIED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  REJECTED: 'bg-gray-100 text-gray-700',
}

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, error: data.error }
}

export function ParentManager({
  parents,
  students,
}: {
  parents: Parent[]
  students: StudentOption[]
}) {
  const router = useRouter()
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // create-parent form state
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setBusy(true)
    setMsg(null)
    const r = await fn()
    setBusy(false)
    setMsg(r.ok ? ok : `Error: ${r.error ?? 'failed'}`)
    if (r.ok) router.refresh()
  }

  return (
    <div className="space-y-8">
      {msg && (
        <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {msg}
        </p>
      )}

      {/* Create parent */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">Create parent account</h2>
        <p className="mt-1 text-sm text-gray-600">
          The parent signs in with this email via Google (or mock in dev).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs font-medium text-gray-600">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-gray-600">
            First name
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-gray-600">
            Last name
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy || !email || !firstName || !lastName}
            onClick={() =>
              run(
                () => post('/api/admin/parents', { email, firstName, lastName }),
                'Parent account created.'
              ).then(() => {
                setEmail('')
                setFirstName('')
                setLastName('')
              })
            }
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300"
          >
            Create
          </button>
        </div>
      </section>

      {/* Parents table */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Parents ({parents.length})</h2>
        {parents.length === 0 ? (
          <p className="text-sm text-gray-600">No parent accounts yet.</p>
        ) : (
          parents.map((p) => (
            <div key={p.parentId} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold text-gray-900">{p.displayName}</p>
                <p className="text-sm text-gray-600">{p.email}</p>
              </div>

              {/* Links */}
              {p.links.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {p.links.map((l) => (
                    <li
                      key={l.linkId}
                      className="flex flex-wrap items-center gap-3 rounded-md bg-gray-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-gray-800">{l.studentName}</span>
                      <span className="capitalize text-gray-600">{l.relationship}</span>
                      <ExplainerHover
                        theme="admin"
                        variant="plain"
                        title="Link status"
                        text="Pending means the link exists but doesn't show data yet. Verified means the parent can see this student's progress. Rejected means the link is disabled."
                      >
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_STYLE[l.verifiedStatus]
                          }`}
                        >
                          {l.verifiedStatus}
                        </span>
                      </ExplainerHover>
                      <span className="ml-auto flex gap-2">
                        {l.verifiedStatus !== 'VERIFIED' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () =>
                                  post('/api/admin/parents/verify', {
                                    linkId: l.linkId,
                                    status: 'VERIFIED',
                                  }),
                                'Link verified.'
                              )
                            }
                            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            Verify
                          </button>
                        )}
                        {l.verifiedStatus !== 'REJECTED' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () =>
                                  post('/api/admin/parents/verify', {
                                    linkId: l.linkId,
                                    status: 'REJECTED',
                                  }),
                                'Link rejected.'
                              )
                            }
                            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Reject
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add link */}
              <AddLinkForm parentId={p.parentId} students={students} busy={busy} onRun={run} />
            </div>
          ))
        )}
      </section>
    </div>
  )
}

function AddLinkForm({
  parentId,
  students,
  busy,
  onRun,
}: {
  parentId: string
  students: StudentOption[]
  busy: boolean
  onRun: (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => Promise<void>
}) {
  const [studentId, setStudentId] = useState('')
  const [relationship, setRelationship] = useState('guardian')

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
      <label className="flex flex-col text-xs font-medium text-gray-600">
        Link student
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">Select…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs font-medium text-gray-600">
        <ExplainerHover
          theme="admin"
          variant="underline"
          title="Relationship"
          text={'A free-text label like "mother" or "guardian" — shown to the parent, not used for any access decisions.'}
        >
          Relationship
        </ExplainerHover>
        <input
          type="text"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </label>
      <button
        type="button"
        disabled={busy || !studentId}
        onClick={() =>
          onRun(
            () => post('/api/admin/parents/link', { parentId, studentId, relationship }),
            'Link created (pending verification).'
          ).then(() => setStudentId(''))
        }
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Add link
      </button>
    </div>
  )
}
