'use client'

import { useState } from 'react'
import type { ImageContent } from '@/lib/lesson-content'
import { FormField, inputClasses, textareaClasses } from './form/FormField'
import { ImageAssetPicker } from './image/ImageAssetPicker'

export function ImageStepEditor({
  value,
  onChange,
  errors,
}: {
  value: ImageContent
  onChange: (value: ImageContent) => void
  errors?: Partial<Record<string, string>>
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const isPhoto = value.asset.startsWith('/media/')

  return (
    <div className="space-y-4">
      <FormField label="Image" error={errors?.asset}>
        {() => (
          <div className="flex items-center gap-3">
            {value.asset && isPhoto && (
              <img src={value.asset} alt="" className="h-16 w-24 rounded object-cover" />
            )}
            <div>
              <p className="text-sm text-gray-700">{value.asset || 'No image chosen'}</p>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-1 rounded-md border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Choose image…
              </button>
            </div>
          </div>
        )}
      </FormField>

      {pickerOpen && (
        <ImageAssetPicker
          currentAsset={value.asset}
          onClose={() => setPickerOpen(false)}
          onPick={({ asset, width, height, caption, credit, license }) => {
            // Prefill only what the teacher hasn't already written — picking a
            // different picture must never wipe their own wording. Alt text
            // and the long description are never prefilled: they are the
            // accessibility content and have to be written by a human who
            // looked at the picture.
            onChange({
              ...value,
              asset,
              width: width ?? value.width,
              height: height ?? value.height,
              caption: value.caption?.trim() ? value.caption : (caption ?? value.caption),
              credit: value.credit?.trim() ? value.credit : (credit ?? value.credit),
              license: value.license?.trim() ? value.license : (license ?? value.license),
            })
            setPickerOpen(false)
          }}
        />
      )}

      <FormField label="Alt text" hint="What the image shows, in one sentence." error={errors?.alt}>
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputClasses}
            value={value.alt}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
          />
        )}
      </FormField>

      <FormField label="Caption" error={errors?.caption}>
        {(props) => (
          <input
            {...props}
            type="text"
            className={inputClasses}
            value={value.caption}
            onChange={(e) => onChange({ ...value, caption: e.target.value })}
          />
        )}
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Credit" error={errors?.credit}>
          {(props) => (
            <input
              {...props}
              type="text"
              className={inputClasses}
              value={value.credit}
              onChange={(e) => onChange({ ...value, credit: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="License" error={errors?.license}>
          {(props) => (
            <input
              {...props}
              type="text"
              className={inputClasses}
              value={value.license}
              onChange={(e) => onChange({ ...value, license: e.target.value })}
            />
          )}
        </FormField>
      </div>

      <FormField
        label="Long description"
        hint="Describe the picture. A student using a screen reader — or one whose picture didn't load — gets this instead."
        error={errors?.longDescription}
      >
        {(props) => (
          <textarea
            {...props}
            className={textareaClasses}
            value={value.longDescription}
            onChange={(e) => onChange({ ...value, longDescription: e.target.value })}
          />
        )}
      </FormField>

      {isPhoto && (
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Width (px)" error={errors?.width}>
            {(props) => (
              <input
                {...props}
                type="number"
                min={1}
                className={inputClasses}
                value={value.width ?? ''}
                onChange={(e) =>
                  onChange({ ...value, width: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            )}
          </FormField>
          <FormField label="Height (px)" error={errors?.height}>
            {(props) => (
              <input
                {...props}
                type="number"
                min={1}
                className={inputClasses}
                value={value.height ?? ''}
                onChange={(e) =>
                  onChange({ ...value, height: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            )}
          </FormField>
        </div>
      )}
    </div>
  )
}
