import { AlertBadge } from '@/components/teacher/shared/AlertBadge'

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  alert?: 'info' | 'warn' | 'critical'
}

export function StatCard({ label, value, subtext, alert }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </span>
        {alert && (
          <AlertBadge tone={alert}>
            {alert === 'critical' ? 'Alert' : alert === 'warn' ? 'Watch' : 'Info'}
          </AlertBadge>
        )}
      </div>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      {subtext && (
        <span className="text-xs text-gray-400">{subtext}</span>
      )}
    </div>
  )
}
