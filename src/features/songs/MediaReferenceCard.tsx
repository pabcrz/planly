import { Headphones, Music, Video, Disc, Link as LinkIcon, ExternalLink, Trash2 } from 'lucide-react'

interface MediaReferenceCardProps {
  url: string
  onDelete?: () => void
  readOnly?: boolean
}

type IconType = 'headphones' | 'music' | 'video' | 'disc' | 'link'

export function parseMediaUrl(url: string) {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    
    let platform = 'Enlace Web'
    let badgeColor = 'bg-gray-100 text-gray-800 ring-gray-200'
    let iconType: IconType = 'link'
    let title = parsed.pathname !== '/' ? parsed.pathname.slice(1).replace(/[-_]/g, ' ') : parsed.hostname

    if (hostname.includes('spotify.com')) {
      platform = 'Spotify®'
      badgeColor = 'bg-emerald-100 text-emerald-800 ring-emerald-300'
      iconType = 'headphones'
      title = 'Pista en Spotify'
    } else if (hostname.includes('music.youtube.com')) {
      platform = 'YouTube Music'
      badgeColor = 'bg-red-100 text-red-800 ring-red-300'
      iconType = 'music'
      title = 'Audio en YouTube Music'
    } else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      platform = 'YouTube'
      badgeColor = 'bg-red-100 text-red-800 ring-red-300'
      iconType = 'video'
      title = 'Video de YouTube'
    } else if (hostname.includes('apple.com')) {
      platform = 'Apple Music'
      badgeColor = 'bg-pink-100 text-pink-800 ring-pink-300'
      iconType = 'disc'
      title = 'Álbum / Pista en Apple Music'
    }

    return { platform, badgeColor, iconType, title, domain: parsed.hostname }
  } catch {
    return {
      platform: 'Enlace',
      badgeColor: 'bg-gray-100 text-gray-800 ring-gray-200',
      iconType: 'link' as IconType,
      title: url,
      domain: 'enlace externo',
    }
  }
}

export function MediaReferenceCard({ url, onDelete, readOnly = true }: MediaReferenceCardProps) {
  const { platform, badgeColor, iconType, title, domain } = parseMediaUrl(url)

  const renderIcon = () => {
    switch (iconType) {
      case 'headphones': return <Headphones className="h-6 w-6 text-emerald-600" />
      case 'music': return <Music className="h-6 w-6 text-red-600" />
      case 'video': return <Video className="h-6 w-6 text-red-600" />
      case 'disc': return <Disc className="h-6 w-6 text-pink-600" />
      default: return <LinkIcon className="h-6 w-6 text-gray-600" />
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-50 ring-1 ring-gray-200/60">
          {renderIcon()}
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
            className="mt-1 flex items-center gap-1 truncate text-sm font-semibold text-gray-900 hover:text-indigo-600 hover:underline"
          >
            <span className="truncate">{title}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          </a>
        </div>
      </div>

      {!readOnly && onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 min-h-11 shrink-0 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 hover:border-red-200 transition-colors"
          title="Eliminar referencia"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Eliminar</span>
        </button>
      ) : null}
    </div>
  )
}
