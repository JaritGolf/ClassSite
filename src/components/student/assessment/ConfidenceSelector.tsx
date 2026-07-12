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
      <legend className="mb-2 font-display text-sm font-bold text-gray-800">
        How confident are you in your answer?
      </legend>
      <div className="flex gap-2.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 border-b-4 px-4 py-3 text-sm font-bold transition-colors active:translate-y-[2px] active:border-b-2 ${
              value === opt.value
                ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/50'
            }`}
            aria-pressed={value === opt.value}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
