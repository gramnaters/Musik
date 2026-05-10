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
      <path d="M9.5 6.4v11.2c0 .7.8 1.1 1.4.7l9-5.6c.5-.3.5-1.1 0-1.4l-9-5.6c-.6-.4-1.4 0-1.4.7z" />
    </svg>
  );
}
