import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MediaReferenceCard, parseMediaUrl } from './MediaReferenceCard'

describe('MediaReferenceCard & parseMediaUrl', () => {
  it('parses Spotify URLs correctly', () => {
    const res = parseMediaUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')
    expect(res.platform).toBe('Spotify®')
    expect(res.title).toBe('Pista en Spotify')
  })

  it('parses YouTube Music URLs correctly', () => {
    const res = parseMediaUrl('https://music.youtube.com/watch?v=123456')
    expect(res.platform).toBe('YouTube Music')
  })

  it('renders media card with external link and delete option', () => {
    const handleDelete = vi.fn()
    render(<MediaReferenceCard url="https://open.spotify.com/track/test" readOnly={false} onDelete={handleDelete} />)

    expect(screen.getByText('Spotify®')).toBeDefined()
    expect(screen.getByRole('link').getAttribute('href')).toBe('https://open.spotify.com/track/test')
    
    fireEvent.click(screen.getByText('Eliminar'))
    expect(handleDelete).toHaveBeenCalled()
  })
})
