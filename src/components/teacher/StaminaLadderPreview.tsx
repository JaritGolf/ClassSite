import { getStaminaLengthForDate } from '@/lib/republic-challenge'
import { ExplainerHover } from '@/components/ui/ExplainerHover'

const ROWS = [
  { label: 'Aug-Oct', length: 10 },
  { label: 'Nov-Dec', length: 15 },
  { label: 'Jan-Feb', length: 20 },
  { label: 'Mar', length: 30 },
  { label: 'Apr', length: 40 },
  { label: 'Late Apr / May', length: null as number | null },
]

export function StaminaLadderPreview() {
  const today = getStaminaLengthForDate(new Date())

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 max-w-md">
      <h3 className="font-semibold text-gray-800 text-sm mb-2">
        <ExplainerHover
          theme="admin"
          variant="underline"
          title="Stamina ladder"
          text="Endurance Trial length grows automatically through the year so students build up to a full-length exam gradually, instead of all at once."
        >
          Stamina ladder
        </ExplainerHover>
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        Endurance Trial session length by time of year (spec §19.1). Today:{' '}
        <span className="font-medium text-indigo-700">
          {today.label} ·{' '}
          {today.length === null ? 'Final Trial length' : `${today.length} questions`}
        </span>
      </p>
      <table className="w-full text-sm">
        <tbody>
          {ROWS.map((row) => {
            const isToday = row.label === today.label
            return (
              <tr key={row.label} className={isToday ? 'font-semibold text-indigo-700' : ''}>
                <td className="py-1">{row.label}</td>
                <td className="py-1 text-right">
                  {row.length === null ? 'Final Trial' : `${row.length} questions`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
