'use client'

import { useEffect, useState } from 'react'

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

export function ImageAssetPicker({
  currentAsset,
  onPick,
  onClose,
}: {
  currentAsset: string
  onPick: (result: { asset: string; width?: number; height?: number }) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'library' | 'upload'>('library')
  const [illustrations, setIllustrations] = useState<LibraryIllustration[]>([])
  const [photos, setPhotos] = useState<LibraryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
      const res = await fetch('/api/lessons/media/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(
          data.error === 'FILE_TOO_LARGE'
            ? 'That file is too large (max 4MB).'
            : data.error === 'UNSUPPORTED_FORMAT'
              ? 'Unsupported image format — use PNG, JPEG, or WebP.'
              : 'Upload failed — try again.'
        )
        return
      }
      onPick({ asset: data.path, width: data.width ?? undefined, height: data.height ?? undefined })
    } finally {
      setUploading(false)
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
                      onPick({ asset: photo.path, width: photo.width ?? undefined, height: photo.height ?? undefined })
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
