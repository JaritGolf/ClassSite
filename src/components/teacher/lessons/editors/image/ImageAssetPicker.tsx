'use client'

import { useEffect, useId, useState } from 'react'

interface LibraryIllustration {
  key: string
  label: string
}
interface LibraryPhoto {
  path: string
  title: string
  author: string
  date: string
  source: string
  sourceUrl: string
  license: string
  licenseNote: string | null
  width: number | null
  height: number | null
}

/**
 * What the picker hands back.
 *
 * The metadata fields matter: an IMAGE step requires alt + caption + credit +
 * license + a 40-character description, which is a real amount of typing. The
 * library endpoint already returns author/source/license/title per photo and
 * this component used to throw all of it away. Passing it through prefills
 * three of the five fields for library images.
 *
 * `alt` and `longDescription` are deliberately NEVER prefilled — they are the
 * accessibility content itself and have to be written by a human who has
 * looked at the picture.
 */
export interface PickedImage {
  asset: string
  width?: number
  height?: number
  caption?: string
  credit?: string
  license?: string
}

/** Plain-language messages for every failure the import route can return. */
const IMPORT_ERRORS: Record<string, string> = {
  INSECURE_SCHEME: 'That link has to start with https:// — try copying the address again.',
  UNSUPPORTED_URL: "That doesn't look like a public web address. Paste the link to the picture itself.",
  BLOCKED_ADDRESS: "That address isn't reachable from here. Try a link from a public website.",
  HOST_UNREACHABLE: "We couldn't find that website. Check the address for a typo.",
  TOO_MANY_REDIRECTS:
    'That link keeps bouncing to other pages. Try right-clicking the picture and copying its direct address.',
  TIMED_OUT:
    'That site took too long to answer. Try again, or save the picture to your computer and upload it instead.',
  NOT_PUBLIC:
    "That picture is behind a login, so we can't fetch it. Save it to your computer and upload it instead.",
  NOT_FOUND: "There's no picture at that address anymore.",
  NOT_AN_IMAGE:
    "That link points to a web page, not a picture. Right-click the picture, choose 'Copy image address', and paste that.",
  UNSUPPORTED_FORMAT: "That picture is in a format we can't use. PNG, JPEG, and WebP all work.",
  FILE_TOO_LARGE: 'That picture is bigger than 4 MB. Try a smaller version.',
  TOO_MANY_IMPORTS:
    "You've added a lot of pictures in the last hour. Give it a few minutes and try again.",
  RIGHTS_NOT_CONFIRMED: 'Tick the box to confirm you have the rights to use this picture.',
  FETCH_FAILED:
    "We couldn't get that picture. Try saving it to your computer and uploading it instead.",
}

export function ImageAssetPicker({
  currentAsset,
  onPick,
  onClose,
}: {
  currentAsset: string
  onPick: (result: PickedImage) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'library' | 'upload' | 'link'>('library')
  const [illustrations, setIllustrations] = useState<LibraryIllustration[]>([])
  const [photos, setPhotos] = useState<LibraryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  // Two image pieces in one module can each open a picker, so these ids must
  // be unique per instance — duplicates would point both labels at the first
  // input. Same approach FormField already takes.
  const linkFieldId = useId()
  const linkHintId = useId()

  useEffect(() => {
    let cancelled = false
    fetch('/api/lessons/media/image-library')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setIllustrations(data.illustrations ?? [])
        setPhotos(data.photos ?? [])
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  async function submitUpload() {
    if (!uploadFile || !rightsConfirmed) return
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append('file', uploadFile)
      // The server enforces this too — the checkbox below is the UI half of a
      // real record, not a client-side nicety.
      form.append('rightsConfirmed', 'true')
      const res = await fetch('/api/lessons/media/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(IMPORT_ERRORS[data.error] ?? 'That upload didn’t work — try again.')
        return
      }
      onPick({
        asset: data.path,
        width: data.width ?? undefined,
        height: data.height ?? undefined,
        license: 'Used with permission',
      })
    } finally {
      setUploading(false)
    }
  }

  /**
   * Paste a link: the SERVER fetches the picture once and stores it on our own
   * domain. The teacher gets the convenience of pasting a URL, and students'
   * browsers never contact the other site.
   */
  async function submitImport() {
    if (!linkUrl.trim() || !rightsConfirmed) return
    setImporting(true)
    setImportError(null)
    try {
      const res = await fetch('/api/lessons/media/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl.trim(), rightsConfirmed: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setImportError(
          IMPORT_ERRORS[data.error] ??
            "We couldn’t get that picture. Try saving it to your computer and uploading it instead."
        )
        return
      }
      onPick({
        asset: data.path,
        width: data.width ?? undefined,
        height: data.height ?? undefined,
        credit: data.sourceHost ? `Source: ${data.sourceHost}` : undefined,
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Choose image"
      className="rounded-md border border-gray-300 bg-white p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'library'}
            onClick={() => setTab('library')}
            className={`rounded-t-md px-3 py-1.5 text-sm font-semibold ${
              tab === 'library' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Library
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'upload'}
            onClick={() => setTab('upload')}
            className={`rounded-t-md px-3 py-1.5 text-sm font-semibold ${
              tab === 'upload' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Upload new
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'link'}
            onClick={() => setTab('link')}
            className={`rounded-t-md px-3 py-1.5 text-sm font-semibold ${
              tab === 'link' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Paste a link
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close image picker"
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ✕
        </button>
      </div>

      {tab === 'library' ? (
        loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="max-h-96 space-y-4 overflow-y-auto">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Illustrations
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {illustrations.map((ill) => (
                  <button
                    key={ill.key}
                    type="button"
                    onClick={() => onPick({ asset: ill.key })}
                    aria-current={currentAsset === ill.key}
                    className={`rounded-md border-2 p-2 text-center text-xs font-medium hover:border-indigo-400 ${
                      currentAsset === ill.key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    {ill.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Photos
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((photo) => (
                  <button
                    key={photo.path}
                    type="button"
                    onClick={() =>
                      onPick({
                        asset: photo.path,
                        width: photo.width ?? undefined,
                        height: photo.height ?? undefined,
                        // Prefill what the library already knows, so the
                        // teacher types two fields instead of five.
                        caption: photo.title || undefined,
                        credit:
                          [photo.author, photo.source].filter(Boolean).join(' / ') || undefined,
                        license: photo.license || undefined,
                      })
                    }
                    aria-current={currentAsset === photo.path}
                    className={`rounded-md border-2 p-2 text-left text-xs hover:border-indigo-400 ${
                      currentAsset === photo.path ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={photo.path}
                      alt=""
                      className="mb-1 h-16 w-full rounded object-cover"
                    />
                    <span className="line-clamp-2 font-medium text-gray-800">{photo.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      ) : tab === 'link' ? (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-800" htmlFor={linkFieldId}>
            Address of the picture
          </label>
          <input
            id={linkFieldId}
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            aria-describedby={linkHintId}
            className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
          <p id={linkHintId} className="text-xs text-gray-600">
            Right-click the picture on the other website, choose{' '}
            <strong>Copy image address</strong>, and paste it here. We save a copy to this site, so
            your students never load anything from the other website — and your picture won&apos;t
            disappear if that site changes.
          </p>
          <p className="text-xs text-gray-600">
            You are responsible for only using images you have the rights to use — owned by you,
            licensed for this use, or public domain.
          </p>
          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={rightsConfirmed}
              onChange={(e) => setRightsConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            I confirm I have the rights to use this image.
          </label>
          {importError && (
            <p role="alert" className="text-xs font-semibold text-rose-700">
              {importError}
            </p>
          )}
          <button
            type="button"
            onClick={submitImport}
            disabled={!linkUrl.trim() || !rightsConfirmed || importing}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {importing ? 'Getting the picture…' : 'Get this picture and use it'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          <p className="text-xs text-gray-600">
            You are responsible for only using images you have the rights to use — owned by you,
            licensed for this use, or public domain. Do not upload copyrighted material without
            permission.
          </p>
          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={rightsConfirmed}
              onChange={(e) => setRightsConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            I confirm I have the rights to use this image.
          </label>
          {uploadError && (
            <p role="alert" className="text-xs font-semibold text-rose-700">
              {uploadError}
            </p>
          )}
          <button
            type="button"
            onClick={submitUpload}
            disabled={!uploadFile || !rightsConfirmed || uploading}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {uploading ? 'Uploading…' : 'Upload and use this image'}
          </button>
        </div>
      )}
    </div>
  )
}
