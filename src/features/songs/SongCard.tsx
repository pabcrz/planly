import { Link } from 'react-router-dom'
import type { Song } from '@/types/models'

interface SongCardProps {
  song: Song
}

export function SongCard({ song }: SongCardProps) {
  return (
    <Link
      to={`/songs/${song.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-gray-900">{song.title}</h3>
          {song.author ? <p className="mt-0.5 truncate text-sm text-gray-500">{song.author}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {song.is_canonical ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              Canonical
            </span>
          ) : null}
          {song.tempo ? (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {song.tempo} BPM
            </span>
          ) : null}
        </div>
      </div>
      {song.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {song.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  )
}
