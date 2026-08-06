import { useEffect, useRef, useState } from 'react'

interface ShareButtonProps {
  className?: string
}

// Copies the current URL to the clipboard and shows transient confirmation.
export function ShareButton({ className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (insecure context or permission denied).
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-live="polite"
      className={`inline-flex min-h-11 items-center justify-center rounded-md border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 ${className}`}
    >
      {copied ? 'Enlace copiado' : 'Copiar enlace'}
    </button>
  )
}
