import { notFound } from 'next/navigation'
import { getMissionContent } from '@/lib/student-content'
import { MissionClient } from '@/components/student/mission/MissionClient'

interface PageProps {
  params: { benchmarkCode: string }
}

/**
 * Mission page. Server-rendered from curriculum only — the same content for
 * every visitor. Where this student is in the mission, whether they have
 * reached it, and which Mastery form they get next are decided in the browser.
 */
export default async function MissionPage({ params }: PageProps) {
  const mission = await getMissionContent(params.benchmarkCode)
  if (!mission) notFound()

  const { playable, ...missionData } = mission

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <p className="font-mono text-xs text-gray-600">{mission.benchmarkCode}</p>
        <h1 className="font-display text-3xl font-bold text-indigo-900">{mission.benchmarkTitle}</h1>
        <p className="mt-1 text-base font-semibold text-indigo-700">{mission.studentFriendlyTarget}</p>
      </div>
      <MissionClient mission={missionData} playable={playable} />
    </div>
  )
}
