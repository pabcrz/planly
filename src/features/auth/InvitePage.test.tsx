import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentSession, verifyInviteToken, updatePassword, activateCurrentUser, signOut } = vi.hoisted(() => ({
  getCurrentSession: vi.fn(), verifyInviteToken: vi.fn(), updatePassword: vi.fn(), activateCurrentUser: vi.fn(), signOut: vi.fn(),
}))

vi.mock('@/services/authService', () => ({ getCurrentSession, verifyInviteToken, updatePassword, activateCurrentUser, signOut }))
vi.mock('@/lib/toast', () => ({ toastSuccess: vi.fn() }))

import { InvitePage } from './InvitePage'

function renderInvite(path = '/auth/invite?token_hash=valid&type=invite') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/auth/invite" element={<InvitePage />} />
    <Route path="/dashboard" element={<p>Tablero</p>} />
    <Route path="/sign-in" element={<p>Inicio de sesión</p>} />
  </Routes></MemoryRouter>)
}

async function submitValidPassword() {
  await waitFor(() => expect(screen.getByLabelText('Contraseña')).toBeTruthy())
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar invitación' }))
  })
}

describe('InvitePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getCurrentSession.mockResolvedValue(null)
  })

  it('leaves the page out of the checking state when session lookup fails', async () => {
    getCurrentSession.mockRejectedValueOnce(new Error('private session error'))
    renderInvite()
    await waitFor(() => expect(screen.getByLabelText('Contraseña')).toBeTruthy())
    expect(screen.queryByText('private session error')).toBeNull()
  })

  it('shows the safe incomplete state for missing or unsupported link types', async () => {
    renderInvite('/auth/invite?token_hash=valid&type=unknown_type')
    await waitFor(() => expect(screen.getByText('El enlace de invitación está incompleto. Solicita una nueva invitación.')).toBeTruthy())
    expect(verifyInviteToken).not.toHaveBeenCalled()
  })

  it('verifies a recovery token and updates the password', async () => {
    verifyInviteToken.mockResolvedValueOnce({ access_token: 'memory-only' })
    updatePassword.mockResolvedValueOnce(undefined)
    activateCurrentUser.mockResolvedValueOnce(undefined)
    renderInvite('/auth/invite?token_hash=valid&type=recovery')
    await waitFor(() => expect(screen.getByLabelText('Contraseña')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'newpassword123' } })
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'newpassword123' } })
      fireEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))
    })
    await waitFor(() => expect(screen.getByText('Tablero')).toBeTruthy())
    expect(verifyInviteToken).toHaveBeenCalledWith('valid', 'recovery')
    expect(updatePassword).toHaveBeenCalledWith('newpassword123')
  })

  it.each([
    ['otp_expired', 'La invitación venció. Solicita una nueva invitación al administrador de Planly.'],
    ['otp_already_used', 'Esta invitación ya fue utilizada. Inicia sesión para continuar.'],
    ['unexpected_provider_code', 'No se pudo validar la invitación. Solicita una nueva invitación.'],
  ])('maps only verified %s token conditions to a sanitized state', async (code, message) => {
    verifyInviteToken.mockRejectedValueOnce({ code, message: 'secret provider detail' })
    renderInvite()
    await submitValidPassword()
    await waitFor(() => expect(screen.getByText(message)).toBeTruthy())
    expect(screen.queryByText('secret provider detail')).toBeNull()
  })

  it('keeps password validation inline without calling the provider', () => {
    renderInvite()
    return waitFor(() => expect(screen.getByRole('button', { name: 'Aceptar invitación' })).toBeTruthy()).then(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Aceptar invitación' }))
      expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeTruthy()
      expect(verifyInviteToken).not.toHaveBeenCalled()
    })
  })

  it('verifies an invite token, updates the password, activates and redirects', async () => {
    verifyInviteToken.mockResolvedValueOnce({ access_token: 'memory-only' })
    updatePassword.mockResolvedValueOnce(undefined)
    activateCurrentUser.mockResolvedValueOnce(undefined)
    renderInvite()
    await submitValidPassword()
    await waitFor(() => expect(screen.getByText('Tablero')).toBeTruthy())
    expect(verifyInviteToken).toHaveBeenCalledWith('valid', 'invite')
    expect(updatePassword).toHaveBeenCalledWith('password123')
    expect(activateCurrentUser).toHaveBeenCalledOnce()
  })

  it('safely redirects when activation and sign-out fail', async () => {
    verifyInviteToken.mockResolvedValueOnce({ access_token: 'memory-only' })
    updatePassword.mockResolvedValueOnce(undefined)
    activateCurrentUser.mockRejectedValueOnce({ message: 'private activation error' })
    signOut.mockRejectedValueOnce(new Error('private sign-out error'))
    renderInvite()
    await submitValidPassword()
    await waitFor(() => expect(screen.getByText('Inicio de sesión')).toBeTruthy())
    expect(signOut).toHaveBeenCalledOnce()
  })
})
