import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-foreground/30 bg-card text-foreground placeholder:text-muted-foreground',
        'flex field-sizing-content min-h-20 w-full rounded-lg border-2 px-3 py-2 text-sm font-medium shadow-none outline-none transition-[box-shadow,border-color]',
        'hover:border-foreground/60',
        'focus-visible:border-ring focus-visible:shadow-[2px_2px_0_0_var(--ring)]',
        'aria-invalid:border-destructive aria-invalid:shadow-[2px_2px_0_0_var(--destructive)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
