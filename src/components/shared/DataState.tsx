import type { ReactNode } from 'react'
import { LoadingSpinner } from './LoadingSpinner'

export interface DataStateProps<T> {
  data: T | undefined
  isLoading: boolean
  error: unknown
  isEmpty?: (data: T) => boolean
  loading?: ReactNode
  errorContent: ReactNode
  emptyContent: ReactNode
  children: (data: T) => ReactNode
}

export function DataState<T>({
  data,
  isLoading,
  error,
  isEmpty,
  loading,
  errorContent,
  emptyContent,
  children,
}: DataStateProps<T>) {
  if (isLoading) return <>{loading ?? <LoadingSpinner />}</>
  if (error) return <>{errorContent}</>
  if (data === undefined || (isEmpty ? isEmpty(data) : false)) return <>{emptyContent}</>
  return <>{children(data)}</>
}
