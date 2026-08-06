import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { verifyOtp, updateUser, signOut, rpc } = vi.hoisted(() => ({
  verifyOtp: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), rpc: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { verifyOtp, updateUser, signOut }, rpc } }))
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
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar invitación' }))
  })
}

describe('InvitePage', () => {
  beforeEach(() => vi.resetAllMocks())

  it('shows the safe incomplete state for missing or unsupported link types', () => {
    renderInvite('/auth/invite?token_hash=valid&type=unknown_type')
    expect(screen.getByText('El enlace de invitación está incompleto. Solicita una nueva invitación.')).toBeTruthy()
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('verifies a recovery token and updates the password', async () => {
    verifyOtp.mockResolvedValueOnce({ data: { session: { access_token: 'memory-only' } }, error: null })
    updateUser.mockResolvedValueOnce({ error: null })
    rpc.mockResolvedValueOnce({ error: null })
    renderInvite('/auth/invite?token_hash=valid&type=recovery')
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'newpassword123' } })
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'newpassword123' } })
      fireEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))
    })
    await waitFor(() => expect(screen.getByText('Tablero')).toBeTruthy())
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'valid', type: 'recovery' })
    expect(updateUser).toHaveBeenCalledWith({ password: 'newpassword123' })
  })

  it.each([
    ['otp_expired', 'La invitación venció. Solicita una nueva invitación al administrador de Planly.'],
    ['otp_already_used', 'Esta invitación ya fue utilizada. Inicia sesión para continuar.'],
    ['unexpected_provider_code', 'No se pudo validar la invitación. Solicita una nueva invitación.'],
  ])('maps only verified %s token conditions to a sanitized state', async (code, message) => {
    verifyOtp.mockResolvedValueOnce({ data: { session: null }, error: { code, message: 'secret provider detail' } })
    renderInvite()
    await submitValidPassword()
    await waitFor(() => expect(screen.getByText(message)).toBeTruthy())
    expect(screen.queryByText('secret provider detail')).toBeNull()
  })

  it('keeps password validation inline without calling the provider', () => {
    renderInvite()
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar invitación' }))
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeTruthy()
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('verifies an invite token, updates the password, activates and redirects', async () => {
    verifyOtp.mockResolvedValueOnce({ data: { session: { access_token: 'memory-only' } }, error: null })
    updateUser.mockResolvedValueOnce({ error: null })
    rpc.mockResolvedValueOnce({ error: null })
    renderInvite()
    await submitValidPassword()
    await waitFor(() => expect(screen.getByText('Tablero')).toBeTruthy())
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'valid', type: 'invite' })
    expect(updateUser).toHaveBeenCalledWith({ password: 'password123' })
    expect(rpc).toHaveBeenCalledWith('activate_current_user')
  })

  it('signs out and safely redirects when activation fails', async () => {
    verifyOtp.mockResolvedValueOnce({ data: { session: { access_token: 'memory-only' } }, error: null })
    updateUser.mockResolvedValueOnce({ error: null })
    rpc.mockResolvedValueOnce({ error: { message: 'private activation error' } })
    renderInvite()
    await submitValidPassword()
    await waitFor(() => expect(screen.getByText('Inicio de sesión')).toBeTruthy())
    expect(signOut).toHaveBeenCalledOnce()
  })
})
