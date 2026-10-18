import { useLayoutEffect, useRef, useState } from 'react'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  size?: 'md' | 'sm'
}

/**
 * Pill segmented control. The selected state is one thumb that slides to the
 * new option instead of options lighting up independently.
 */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: Props<T>) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null)
  const [animated, setAnimated] = useState(false)

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => {
      const active = track.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      if (!active) return
      setThumb({ x: active.offsetLeft, w: active.offsetWidth })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    // Only animate after the first placement, so the thumb never grows from 0.
    const frame = requestAnimationFrame(() => setAnimated(true))
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, options.length])

  return (
    <div
      ref={trackRef}
      className={`segmented segmented-${size}`}
      role="radiogroup"
      aria-label={ariaLabel}
      data-animated={animated || undefined}
    >
      {thumb && (
        <span
          className="segmented-thumb"
          aria-hidden="true"
          style={{ transform: `translateX(${thumb.x}px)`, width: thumb.w }}
        />
      )}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className="segmented-option"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
