'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Softer gray border at rest, full primary fill when checked.
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-foreground/30 transition-[background-color,box-shadow,border-color] outline-none',
        'data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=unchecked]:bg-muted',
        'hover:border-foreground/50 hover:shadow-[1px_1px_0_0_var(--foreground)/20]',
        'focus-visible:shadow-[2px_2px_0_0_var(--ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Thumb is white with subtle shadow, no harsh border.
          'pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform',
          'data-[state=checked]:translate-x-[1.25rem] data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
