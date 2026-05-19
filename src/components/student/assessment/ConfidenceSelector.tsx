'use client'

interface ConfidenceSelectorProps {
  value: string | null
  onChange: (value: string) => void
}

const OPTIONS = [
  { value: 'NOT_SURE', label: 'Not sure', emoji: '🤔' },
  { value: 'PRETTY_SURE', label: 'Pretty sure', emoji: '🙂' },
  { value: 'VERY_SURE', label: 'Very sure', emoji: '😎' },
]

export function ConfidenceSelector({ value, onChange }: ConfidenceSelectorProps) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-700 mb-2">
        How confident are you in your answer?
      </legend>
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              value === opt.value
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
            aria-pressed={value === opt.value}
          >
            <span className="text-xl">{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
