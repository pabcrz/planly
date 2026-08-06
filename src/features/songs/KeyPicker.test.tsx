import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KeyPicker } from './KeyPicker'

describe('KeyPicker', () => {
  it('renders current key and toggles popover', () => {
    const handleChange = vi.fn()
    render(<KeyPicker value="G" onChange={handleChange} />)

    expect(screen.getByText('G')).toBeDefined()
    
    // Open picker
    fireEvent.click(screen.getByText('G'))
    expect(screen.getByText('Mayor')).toBeDefined()
    expect(screen.getByText('Menor')).toBeDefined()
    
    // Select a major key
    fireEvent.click(screen.getByText('C#'))
    expect(handleChange).toHaveBeenCalledWith('C#')
  })

  it('switches to minor tab and selects minor key', () => {
    const handleChange = vi.fn()
    render(<KeyPicker value="Sin tono" onChange={handleChange} />)

    fireEvent.click(screen.getByText('Sin tono'))
    fireEvent.click(screen.getByText('Menor'))
    fireEvent.click(screen.getByText('Am'))

    expect(handleChange).toHaveBeenCalledWith('Am')
  })
})
