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
      <path d="M8 5.14v14.72a1.07 1.07 0 0 0 1.61.93L19 14.43a1.07 1.07 0 0 0 0-1.86L9.61 4.21A1.07 1.07 0 0 0 8 5.14z" />
    </svg>
  );
}
