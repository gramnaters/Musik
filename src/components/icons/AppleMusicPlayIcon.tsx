/**
 * Rounded triangle play glyph — matches Apple Music / SF-style soft vertices
 * (Heroicons 24 solid play path).
 */
export function AppleMusicPlayIcon({
  size,
  className,
  'aria-hidden': ariaHidden = true,
}: {
  size: number;
  className?: string;
  'aria-hidden'?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}
