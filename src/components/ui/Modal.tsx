import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

type MaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'max-content'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  maxWidth?: MaxWidth
  className?: string
}

export function Modal({
  open,
  onClose,
  children,
  title,
  maxWidth = 'md',
  className = '',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    }
    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const maxWidthClasses: Record<MaxWidth, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    'max-content': 'max-w-max',
  }

  const baseClasses = 'm-auto w-full rounded-xl p-0 shadow-xl backdrop:bg-black/40 border border-gray-100 bg-white'
  const finalClasses = `${baseClasses} ${maxWidthClasses[maxWidth]} ${className}`.trim()

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className={finalClasses}
    >
      {title ? (
        <div className="flex flex-col gap-4 p-6 max-h-[85vh] overflow-y-auto">
          <div>
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">
              {title}
            </h2>
          </div>
          {children}
        </div>
      ) : (
        children
      )}
    </dialog>
  )
}
