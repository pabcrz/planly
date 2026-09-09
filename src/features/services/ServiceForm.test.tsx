import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createService, updateService, changeStatus, getChurchSettings, updateChurchServiceTypes, useChurch } = vi.hoisted(() => ({
  createService: vi.fn(),
  updateService: vi.fn(),
  changeStatus: vi.fn(),
  getChurchSettings: vi.fn(),
  updateChurchServiceTypes: vi.fn(),
  useChurch: vi.fn(),
}))

vi.mock('@/services/serviceService', () => ({ createService, updateService, changeStatus }))
vi.mock('@/services/peopleService', () => ({ getChurchSettings, updateChurchServiceTypes }))
vi.mock('@/app/providers/ChurchProvider', () => ({ useChurch }))

import { ServiceForm } from './ServiceForm'

const churchId = '11111111-1111-4111-8111-111111111111'
const serviceId = '33333333-3333-4333-8333-333333333333'

function renderForm(service?: Parameters<typeof ServiceForm>[0]['service']) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ServiceForm open churchId={churchId} service={service} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

function expectNoTimezoneFormControl(expectedControlIds: string[]) {
  expect(screen.queryByLabelText(/time\s*zone|zona\s*horaria|huso\s*horario/i)).toBeNull()

  const formControlIds = Array.from(document.querySelectorAll('form input, form select, form textarea'))
    .map((control) => control.id)
  expect(formControlIds).toEqual(expectedControlIds)
}

describe('ServiceForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('HTMLDialogElement', HTMLDialogElement)
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
    useChurch.mockReturnValue({ activeMembership: { role: 'church_admin' } })
    getChurchSettings.mockResolvedValue({ service_types: ['general', 'especial'] })
  })

  it('renders nothing for users without a manager role', () => {
    useChurch.mockReturnValue({ activeMembership: { role: 'member' } })
    renderForm()

    expect(screen.queryByText('Nuevo servicio')).toBeNull()
    expect(document.querySelector('form')).toBeNull()
  })

  it('does not render a timezone control and creates services with the fixed Mexico City timezone', async () => {
    createService.mockResolvedValue({ id: serviceId })
    renderForm()

    await screen.findByText('Especial')
    await screen.findByLabelText('Fecha *')
    expectNoTimezoneFormControl(['service-type', 'service-date', 'service-time', 'service-director', 'service-notes'])

    fireEvent.change(screen.getByLabelText('Fecha *'), { target: { value: '2026-08-02' } })
    fireEvent.change(screen.getByLabelText('Hora de inicio *'), { target: { value: '10:00' } })
    fireEvent.click(screen.getByText('Crear servicio'))

    await waitFor(() => expect(createService).toHaveBeenCalledWith({
      church_id: churchId,
      service_type: 'general',
      director: null,
      service_date: '2026-08-02',
      start_time: '10:00',
      timezone: 'America/Mexico_City',
      notes: null,
    }))
  })

  it('does not render a timezone control and keeps the fixed Mexico City timezone when updating a service', async () => {
    const service = {
      id: serviceId,
      church_id: churchId,
      service_date: '2026-08-02',
      start_time: '10:00:00',
      timezone: 'America/Mexico_City',
      director: 'Pastor Juan',
      service_type: 'especial',
      status: 'planned' as const,
      notes: 'Ensayo',
      created_at: '2026-08-01T00:00:00Z',
    }
    updateService.mockResolvedValue(service)
    renderForm(service)

    await screen.findByText('Especial')
    await screen.findByLabelText('Fecha *')
    expectNoTimezoneFormControl(['service-type', 'service-date', 'service-time', 'service-director', 'service-status', 'service-notes'])
    fireEvent.click(screen.getByText('Guardar cambios'))

    await waitFor(() => expect(updateService).toHaveBeenCalledWith(serviceId, {
      service_type: 'especial',
      director: 'Pastor Juan',
      service_date: '2026-08-02',
      start_time: '10:00',
      timezone: 'America/Mexico_City',
      notes: 'Ensayo',
    }))
    expect(changeStatus).not.toHaveBeenCalled()
  })
})
