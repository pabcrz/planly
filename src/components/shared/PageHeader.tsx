import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  )
}
