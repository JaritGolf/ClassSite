interface StreakWidgetProps {
  currentLength: number
  longestLength: number
  freezeTokens: number
}

export function StreakWidget({ currentLength, longestLength, freezeTokens }: StreakWidgetProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-4">
      <div className="flex flex-col items-center">
        <span className="text-3xl">🔥</span>
        <span className="text-xs text-gray-500 mt-1">streak</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{currentLength}<span className="text-sm font-normal text-gray-500 ml-1">day{currentLength !== 1 ? 's' : ''}</span></p>
        <p className="text-xs text-gray-400">Best: {longestLength} day{longestLength !== 1 ? 's' : ''}</p>
      </div>
      {freezeTokens > 0 && (
        <div className="ml-auto flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-sm text-blue-700 font-medium" title="Freeze tokens protect your streak if you miss a day">
          🧊 ×{freezeTokens}
        </div>
      )}
    </div>
  )
}
