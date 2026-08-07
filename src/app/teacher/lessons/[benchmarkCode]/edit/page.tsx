import { redirect } from 'next/navigation'

interface PageProps {
  params: { benchmarkCode: string }
}

/**
 * Permanently moved into the Lesson Builder (ADR 0023).
 *
 * Editing a module's wording and hiding it used to live on two different pages
 * for the same module — a split by capability, not by anything a teacher
 * thinks about. Kept as a redirect rather than deleted because this URL is
 * linkable and may be bookmarked.
 */
export default function TeacherLessonEditRedirect({ params }: PageProps) {
  redirect(`/teacher/lessons/${params.benchmarkCode}`)
}
