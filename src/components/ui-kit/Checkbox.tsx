'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            'w-4 h-4 text-primary bg-white border-gray-300 rounded',
            'focus:ring-2 focus:ring-primary focus:ring-offset-0',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {label && (
          <span className="text-sm text-gray-700 select-none">{label}</span>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'
