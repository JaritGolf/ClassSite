/**
 * Small stroke-based SVG icon set (24×24, currentColor) for nav items, cards,
 * chips and step headers. Inherits text color, so it stays legible in
 * high-contrast mode automatically. Decorative: aria-hidden by default.
 */

import type { ReactNode } from 'react'

export type TrackIconName =
  | 'home'
  | 'map'
  | 'flag'
  | 'bolt'
  | 'shield'
  | 'search'
  | 'compass'
  | 'medal'
  | 'lock'
  | 'star'
  | 'check'
  | 'book'
  | 'flame'
  | 'sparkle'
  | 'target'
  | 'chat'

const PATHS: Record<TrackIconName, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  map: (
    <>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4.5c4-2 7 2 11.5 0V13c-4.5 2-7.5-2-11.5 0" />
    </>
  ),
  bolt: <path d="M13 2L4.5 14H11l-1.5 8L18.5 10H12l1-8z" />,
  shield: <path d="M12 3l7.5 3v5.5c0 5-3.7 8.3-7.5 10.5-3.8-2.2-7.5-5.5-7.5-10.5V6L12 3z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8L21 21" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-1.8 4.2L9 15l1.8-4.2L15 9z" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="15" r="5" />
      <path d="M8.7 10.8L6 3h4.2L12 8l1.8-5H18l-2.7 7.8" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7.5a4 4 0 018 0V11" />
    </>
  ),
  star: (
    <path d="M12 3l2.7 5.5 6 .9-4.3 4.3 1 6L12 16.9 6.6 19.7l1-6L3.3 9.4l6-.9L12 3z" />
  ),
  check: <path d="M4.5 12.5l5 5L19.5 6.5" />,
  book: (
    <>
      <path d="M12 6.5C10.2 4.9 7.7 4.4 5 4.4v14c2.7 0 5.2.5 7 2.1 1.8-1.6 4.3-2.1 7-2.1v-14c-2.7 0-5.2.5-7 2.1z" />
      <path d="M12 6.5v14" />
    </>
  ),
  flame: (
    <path d="M12 3s5.5 4.8 5.5 9.7A5.5 5.5 0 016.5 12.7c0-2.2 1.1-3.9 2.2-5.5.6 2.2 1.7 3 1.7 3S12 6.4 12 3z" />
  ),
  sparkle: (
    <>
      <path d="M12 4l1.6 3.9L17.5 9.5l-3.9 1.6L12 15l-1.6-3.9L6.5 9.5l3.9-1.6L12 4z" />
      <path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" />
    </>
  ),
  chat: (
    <path d="M21 12a8 8 0 01-8 8H4l2.3-3A8 8 0 1121 12z" />
  ),
}

interface TrackIconProps {
  name: TrackIconName
  className?: string
  strokeWidth?: number
}

export function TrackIcon({ name, className = 'h-5 w-5', strokeWidth = 2 }: TrackIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {PATHS[name]}
    </svg>
  )
}
