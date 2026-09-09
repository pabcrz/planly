import { cloneElement } from 'react'
import type { ReactElement, ReactNode } from 'react'

interface FormFieldProps {
  id: string
  label: ReactNode
  error?: string
  children: ReactElement<{ id?: string }>
  className?: string
  labelClassName?: string
  errorClassName?: string
}

export function FormField({
  id,
  label,
  error,
  children,
  className = 'space-y-1',
  labelClassName = 'block text-sm font-medium text-gray-700',
  errorClassName = 'mt-1 block text-xs text-red-600',
}: FormFieldProps) {
  const errorId = `${id}-error`
  const control = cloneElement(children, {
    id,
    ...(error ? { 'aria-describedby': errorId, 'aria-invalid': true } : {}),
  })

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      {control}
      {error ? (
        <p id={errorId} className={errorClassName}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
