import Link from 'next/link'
import { Mascot } from '@/components/ui/Mascot'
import { TrackIcon } from '@/components/ui/TrackIcon'

const FEATURES = [
  { icon: 'map', label: 'Mission Map', text: 'Journey through the Republic, one mission at a time.' },
  { icon: 'bolt', label: 'Daily Drill', text: 'Quick daily review that keeps what you learned sharp.' },
  { icon: 'medal', label: 'Badges', text: 'Earn medals as you master Florida Civics.' },
] as const

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-indigo-50 bg-dots bg-[length:26px_26px] px-4 py-16">
      {/* Decorative floating shapes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <svg className="absolute left-[8%] top-[14%] h-10 w-10 text-amber-400 animate-float" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3l2.7 5.5 6 .9-4.3 4.3 1 6L12 16.9 6.6 19.7l1-6L3.3 9.4l6-.9L12 3z" />
        </svg>
        <svg className="absolute right-[10%] top-[22%] h-8 w-8 text-rose-400 animate-float [animation-delay:600ms]" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="9" />
        </svg>
        <svg className="absolute left-[16%] bottom-[18%] h-9 w-9 text-sky-400 animate-float [animation-delay:1200ms]" viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="4" width="16" height="16" rx="4" />
        </svg>
        <svg className="absolute right-[14%] bottom-[24%] h-10 w-10 text-green-400 animate-float [animation-delay:300ms]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3l9 16H3l9-16z" />
        </svg>
      </div>

      <div className="relative flex flex-col items-center text-center">
        <div className="animate-pop-in">
          <Mascot pose="celebrating" className="h-36 w-36" title="The Founder, Civics Quest's eagle mascot" />
        </div>

        <h1 className="mt-4 font-display text-5xl font-bold text-indigo-900 animate-pop-in [animation-delay:100ms] sm:text-6xl">
          Civics Quest
        </h1>
        <p className="mt-1 font-display text-xl font-semibold text-indigo-600 animate-pop-in [animation-delay:180ms]">
          Build the Republic
        </p>
        <p className="mt-4 max-w-md text-lg text-gray-700 animate-pop-in [animation-delay:260ms]">
          Master Florida 7th Grade Civics through missions, drills, and challenges — and
          build your Republic along the way.
        </p>

        <Link
          href="/login"
          className="mt-8 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-8 py-3.5 font-display text-lg font-bold text-white transition-colors hover:bg-indigo-500 active:translate-y-[3px] active:border-b-0 animate-pop-in [animation-delay:340ms]"
        >
          Start Your Mission →
        </Link>

        <div className="mt-12 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              className="rounded-2xl border-2 border-indigo-100 bg-white p-5 text-left shadow-card animate-pop-in"
              style={{ animationDelay: `${420 + i * 90}ms` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <TrackIcon name={f.icon} className="h-5 w-5" />
              </div>
              <p className="mt-3 font-display text-base font-bold text-gray-900">{f.label}</p>
              <p className="mt-1 text-sm text-gray-600">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
