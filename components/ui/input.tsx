import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Softer gray border at rest, darkens on hover/focus for visual hierarchy.
        'border-foreground/30 bg-card text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground',
        'flex h-10 w-full min-w-0 rounded-lg border-2 px-3 py-1 text-sm font-medium shadow-none outline-none transition-[box-shadow,border-color,transform]',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        'hover:border-foreground/60',
        // Focus = violet border + small offset shadow (mirrors PopCard motif)
        'focus-visible:border-ring focus-visible:shadow-[2px_2px_0_0_var(--ring)]',
        'aria-invalid:border-destructive aria-invalid:shadow-[2px_2px_0_0_var(--destructive)]',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
