/** Hairline icon set (1.6px stroke, round caps) drawn on a 20px grid. */
const PATHS = {
  file: 'M5.5 3h6l4 4v9.5a.5.5 0 0 1-.5.5H5.5a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5ZM11.5 3v4h4',
  open: 'M3 6.5V15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-6L8.5 5H4a1 1 0 0 0-1 1.5Z',
  download: 'M10 3.5v9M6.5 9 10 12.5 13.5 9M4 16h12',
  copy: 'M7.5 7.5h8v8.5h-8zM12.5 7.5V4H4v8.5h3.5',
  expand: 'M12 4h4v4M8 16H4v-4M16 4l-5 5M4 16l5-5',
  collapse: 'M15.5 8.5h-4v-4M4.5 11.5h4v4M11.5 8.5 16 4M8.5 11.5 4 16',
  arrowRight: 'M4 10h11.5M11 5.5l4.5 4.5-4.5 4.5',
  arrowLeft: 'M16 10H4.5M9 5.5 4.5 10 9 14.5',
  wand: 'M4 16 13 7M11.5 5.5l3 3M15 3v2.5M16.25 4.25h-2.5M5.5 4v2M6.5 5h-2',
  compare: 'M7 3.5v13M13 3.5v13M3.5 7H7M3.5 13H7M13 10h3.5',
  check: 'M4.5 10.5 8 14l7.5-8',
  swap: 'M4 7h11.5M12.5 4l3 3-3 3M16 13H4.5M7.5 10l-3 3 3 3',
  chevronUp: 'M5.5 12.5 10 8l4.5 4.5',
  chevronDown: 'M5.5 7.5 10 12l4.5-4.5',
  caret: 'M8 5.5 12.5 10 8 14.5',
  format: 'M4 5h12M4 10h8M4 15h10',
  import: 'M10 3.5v8M6.5 8 10 11.5 13.5 8M4 13.5V16h12v-2.5',
  trash: 'M4.5 6h11M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6',
  panel: 'M3.5 5.5h13v9h-13zM3.5 9h13',
} as const

export type IconName = keyof typeof PATHS

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
