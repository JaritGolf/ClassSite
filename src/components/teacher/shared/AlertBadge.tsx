import type { ReactNode } from 'react'

interface AlertBadgeProps {
  tone: 'info' | 'warn' | 'critical'
  icon?: ReactNode
  children: ReactNode
}

const TONE_STYLES: Record<AlertBadgeProps['tone'], string> = {
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warn: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  critical: 'bg-red-50 text-red-800 border-red-200',
}

const DEFAULT_ICONS: Record<AlertBadgeProps['tone'], ReactNode> = {
  info: (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warn: (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  critical: (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
}

/**
 * AlertBadge — always shows icon + text + color (never color-only) for WCAG compliance.
 */
export function AlertBadge({ tone, icon, children }: AlertBadgeProps) {
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_STYLES[tone]}`}
    >
      {icon ?? DEFAULT_ICONS[tone]}
      {children}
    </span>
  )
}
