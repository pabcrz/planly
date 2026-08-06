interface MediaReferenceCardProps {
  url: string
  onDelete?: () => void
  readOnly?: boolean
}

export function parseMediaUrl(url: string) {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    
    let platform = 'Enlace Web'
    let badgeColor = 'bg-gray-100 text-gray-800 ring-gray-200'
    let icon = '🔗'
    let title = parsed.pathname !== '/' ? parsed.pathname.slice(1).replace(/[-_]/g, ' ') : parsed.hostname

    if (hostname.includes('spotify.com')) {
      platform = 'Spotify®'
      badgeColor = 'bg-emerald-100 text-emerald-800 ring-emerald-300'
      icon = '🎧'
      title = 'Pista en Spotify'
    } else if (hostname.includes('music.youtube.com')) {
      platform = 'YouTube Music'
      badgeColor = 'bg-red-100 text-red-800 ring-red-300'
      icon = '🎵'
      title = 'Audio en YouTube Music'
    } else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      platform = 'YouTube'
      badgeColor = 'bg-red-100 text-red-800 ring-red-300'
      icon = '▶️'
      title = 'Video de YouTube'
    } else if (hostname.includes('apple.com')) {
      platform = 'Apple Music'
      badgeColor = 'bg-pink-100 text-pink-800 ring-pink-300'
      icon = '🍎'
      title = 'Álbum / Pista en Apple Music'
    }

    return { platform, badgeColor, icon, title, domain: parsed.hostname }
  } catch {
    return {
      platform: 'Enlace',
      badgeColor: 'bg-gray-100 text-gray-800 ring-gray-200',
      icon: '🔗',
      title: url,
      domain: 'enlace externo',
    }
  }
}

export function MediaReferenceCard({ url, onDelete, readOnly = true }: MediaReferenceCardProps) {
  const { platform, badgeColor, icon, title, domain } = parseMediaUrl(url)

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-xl ring-1 ring-gray-200/60">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${badgeColor}`}>
              {platform}
            </span>
            <span className="truncate text-xs text-gray-400">{domain}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-sm font-semibold text-gray-900 hover:text-indigo-600 hover:underline"
          >
            {title} ↗
          </a>
        </div>
      </div>

      {!readOnly && onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="min-h-11 shrink-0 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 hover:border-red-200 transition-colors"
          title="Eliminar referencia"
        >
          Eliminar
        </button>
      ) : null}
    </div>
  )
}
