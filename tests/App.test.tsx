import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('[REQ-TALK-01] 対話診断', () => {
  it('診断オプションを選択すると状態が更新される', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /痛みを確認/i }))

    expect(screen.getByText(/症状タグ: 疼痛/i)).toBeInTheDocument()
    expect(screen.getByText(/推奨ターゲット: アスピリン/i)).toBeInTheDocument()
  })
})
