import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

export function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const hasCustomJustify = className.includes('justify-')
  const baseClasses = `inline-flex items-center ${hasCustomJustify ? '' : 'justify-center'} font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`
  
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 border border-transparent',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500 border border-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500 border border-transparent',
  }

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-9 px-3 text-sm rounded-md',
    md: 'min-h-11 px-4 py-2 text-sm rounded-md',
    icon: 'h-10 w-10 rounded-full',
  }

  const stateClasses = (disabled || isLoading) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''

  const finalClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${stateClasses} ${className}`.trim()

  return (
    <button className={finalClasses} disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : null}
      {children}
    </button>
  )
}
