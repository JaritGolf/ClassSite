import type { ReactNode } from 'react'

interface AdminShellProps {
  children: ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
