'use client';

import { cn } from '@/lib/utils';

/** Interlocking chain (connected services); uses currentColor for nav / theme. */
export function ConnectionsNavIcon({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <path
        d="M9 17H7A5 5 0 0 1 7 7h2"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path
        d="M15 7h2a5 5 0 1 1 0 10h-2"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}
