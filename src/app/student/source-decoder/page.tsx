import { getSourceDecoderMissions } from '@/lib/reading-load'
import { SourceDecoderTrack } from '@/components/source-decoder/SourceDecoderTrack'

export const metadata = { title: 'Source Decoder' }

const SAMPLE_PASSAGE =
  'We hold these truths to be self-evident, that all men are created equal, that they are ' +
  'endowed by their Creator with certain unalienable Rights, that among these are Life, ' +
  'Liberty and the pursuit of Happiness.'

export default function SourceDecoderPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header>
        <p className="font-display text-xs font-bold uppercase tracking-widest text-sky-600">Parallel Track</p>
        <h1 className="font-display text-3xl font-bold text-indigo-900">Source Decoder</h1>
        <p className="mt-1 text-base text-gray-600">
          Level up your reading skills for tough EOC passages. Complete each level to unlock the
          next.
        </p>
      </header>
      <SourceDecoderTrack missions={getSourceDecoderMissions()} sampleStimulus={SAMPLE_PASSAGE} />
    </div>
  )
}
