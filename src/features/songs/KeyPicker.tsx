import { useState } from 'react'

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
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex min-h-11 min-w-20 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
      >
        <span>{value || 'Sin tono'}</span>
        <span className="text-xs text-gray-500">▼</span>
      </button>

      {isOpen ? (
        <div className="absolute z-50 mt-2 w-64 rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/10">
          <div className="mb-3 flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setTab('major')}
              className={`flex-1 rounded-md py-1 text-xs font-semibold ${
                tab === 'major' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mayor
            </button>
            <button
              type="button"
              onClick={() => setTab('minor')}
              className={`flex-1 rounded-md py-1 text-xs font-semibold ${
                tab === 'minor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Menor
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {keys.map((row, rowIdx) =>
              row.map((k, colIdx) => {
                if (!k) return <div key={`empty-${rowIdx}-${colIdx}`} className="h-9" />
                const isSelected = value === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      onChange(k)
                      setIsOpen(false)
                    }}
                    className={`flex h-9 items-center justify-center rounded-md text-sm font-medium ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'bg-gray-50 text-gray-800 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    {k}
                  </button>
                )
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange('Sin tono')
              setIsOpen(false)
            }}
            className="mt-3 w-full rounded-md border border-gray-300 bg-gray-50 py-1.5 text-center text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Sin tono
          </button>
          
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-2 w-full text-center text-xs text-indigo-600 hover:underline"
          >
            Cerrar
          </button>
        </div>
      ) : null}
    </div>
  )
}
