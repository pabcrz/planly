import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataState } from './DataState'

describe('DataState', () => {
  it('renders the loading state', () => {
    render(
      <DataState
        data={undefined}
        isLoading
        error={null}
        errorContent={<p>Error</p>}
        emptyContent={<p>Empty</p>}
      >
        {() => <p>Success</p>}
      </DataState>,
    )

    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText('Cargando…')).toBeTruthy()
  })

  it('renders the error state', () => {
    render(
      <DataState
        data={undefined}
        isLoading={false}
        error={new Error('request failed')}
        errorContent={<p role="alert">Unable to load items.</p>}
        emptyContent={<p>Empty</p>}
      >
        {() => <p>Success</p>}
      </DataState>,
    )

    expect(screen.getByRole('alert').textContent).toBe('Unable to load items.')
  })

  it('renders the caller-provided empty state', () => {
    render(
      <DataState
        data={[]}
        isLoading={false}
        error={null}
        isEmpty={(items) => items.length === 0}
        errorContent={<p>Error</p>}
        emptyContent={<p>No songs yet.</p>}
      >
        {(items) => <p>{items.length} items</p>}
      </DataState>,
    )

    expect(screen.getByText('No songs yet.')).toBeTruthy()
  })

  it('renders the data through the success child', () => {
    render(
      <DataState
        data={['Planly Centro']}
        isLoading={false}
        error={null}
        isEmpty={(items) => items.length === 0}
        errorContent={<p>Error</p>}
        emptyContent={<p>Empty</p>}
      >
        {(items) => <p>{items[0]}</p>}
      </DataState>,
    )

    expect(screen.getByText('Planly Centro')).toBeTruthy()
  })
})
