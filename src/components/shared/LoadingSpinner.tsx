export function LoadingSpinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
    </div>
  )
}
