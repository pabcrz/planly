import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface KeyPickerProps {
  value: string
  onChange: (key: string) => void
  label?: string
  disabled?: boolean
  id?: string
}

const MAJOR_KEYS = [
  ['Ab', 'A', ''],
  ['Bb', 'B', ''],
  ['', 'C', 'C#'],
  ['Db', 'D', ''],
  ['Eb', 'E', ''],
  ['', 'F', 'F#'],
  ['Gb', 'G', 'G#'],
]

const MINOR_KEYS = [
  ['Abm', 'Am', ''],
  ['Bbm', 'Bm', ''],
  ['', 'Cm', 'C#m'],
  ['Dbm', 'Dm', ''],
  ['Ebm', 'Em', ''],
  ['', 'Fm', 'F#m'],
  ['Gbm', 'Gm', 'G#m'],
]

export function KeyPicker({ value, onChange, label = 'Tonalidad', disabled = false, id }: KeyPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<'major' | 'minor'>(
    value.endsWith('m') && value !== 'Sin tono' ? 'minor' : 'major'
  )

  const keys = tab === 'major' ? MAJOR_KEYS : MINOR_KEYS

  return (
    <div className="relative inline-block text-left">
      {label ? <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">{label}</label> : null}
      <Button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        className="min-w-20 gap-2"
      >
        <span>{value || 'Sin tono'}</span>
        <span className="text-xs text-gray-500">▼</span>
      </Button>

      {isOpen ? (
        <div className="absolute z-50 mt-2 w-64 rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/10">
          <div className="mb-3 flex rounded-lg bg-gray-100 p-1">
            <Button
              type="button"
              size="sm"
              variant={tab === 'major' ? 'secondary' : 'ghost'}
              onClick={() => setTab('major')}
              className="flex-1"
            >
              Mayor
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === 'minor' ? 'secondary' : 'ghost'}
              onClick={() => setTab('minor')}
              className="flex-1"
            >
              Menor
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {keys.map((row, rowIdx) =>
              row.map((k, colIdx) => {
                if (!k) return <div key={`empty-${rowIdx}-${colIdx}`} className="h-9" />
                const isSelected = value === k
                return (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant={isSelected ? 'primary' : 'secondary'}
                    onClick={() => {
                      onChange(k)
                      setIsOpen(false)
                    }}
                    className="flex h-9 items-center justify-center"
                  >
                    {k}
                  </Button>
                )
              })
            )}
          </div>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              onChange('Sin tono')
              setIsOpen(false)
            }}
            className="mt-3 w-full"
          >
            Sin tono
          </Button>
          
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="mt-2 w-full"
          >
            Cerrar
          </Button>
        </div>
      ) : null}
    </div>
  )
}
