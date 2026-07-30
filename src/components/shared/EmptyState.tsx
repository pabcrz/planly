import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon ? <div className="text-4xl text-gray-300">{icon}</div> : null}
      <h2 className="text-base font-medium text-gray-900">{title}</h2>
      {message ? <p className="max-w-sm text-sm text-gray-500">{message}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
