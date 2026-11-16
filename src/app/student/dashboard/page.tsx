import { StudentDashboard } from '@/components/student/dashboard/StudentDashboard'

export const metadata = { title: 'Dashboard' }

/** Everything on the dashboard is about the student, so all of it renders on the device. */
export default function DashboardPage() {
  return <StudentDashboard />
}
