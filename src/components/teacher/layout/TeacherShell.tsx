import type { ReactNode } from 'react'

interface TeacherShellProps {
  children: ReactNode
}

export function TeacherShell({ children }: TeacherShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
