import { MissionMapClient } from '@/components/student/map/MissionMapClient'

// The root layout's title template appends " — My Civics Class".
export const metadata = { title: 'Mission Map' }

/** The map's missions come from the layout; what is open is decided on the device. */
export default function MapPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 font-display text-3xl font-bold text-indigo-900">Mission Map</h1>
      <p className="mb-6 text-base text-gray-600">
        Follow the trail, master each mission, and build the Republic region by region.
      </p>
      <MissionMapClient />
    </div>
  )
}
