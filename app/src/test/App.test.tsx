import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../app/App'
import { APP_VERSION } from '../lib/version'

describe('App-Shell', () => {
  it('startet auf „Heute" und zeigt alle vier Tabs', () => {
    render(<App />)
    for (const label of ['Heute', 'Kalender', 'To-dos', 'Mehr']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByRole('tab', { name: 'Heute' })).toHaveAttribute('aria-selected', 'true')
  })

  it('wechselt den Tab und zeigt unter „Mehr" die Versionsnummer', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Mehr' }))
    expect(screen.getByRole('tab', { name: 'Mehr' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(APP_VERSION)).toBeInTheDocument()
  })
})
