import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormField } from './FormField'

describe('FormField', () => {
  it('associates the label and control and exposes field errors accessibly', () => {
    render(
      <FormField id="email" label="Correo electrónico" error="Ingresa un correo válido.">
        <input />
      </FormField>,
    )

    const control = screen.getByLabelText('Correo electrónico')
    expect(control.getAttribute('id')).toBe('email')
    expect(control.getAttribute('aria-invalid')).toBe('true')
    expect(control.getAttribute('aria-describedby')).toBe('email-error')
    expect(screen.getByText('Ingresa un correo válido.').getAttribute('id')).toBe('email-error')
  })
})
