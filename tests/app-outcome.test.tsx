import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

/**
 * [EP01 勝敗検証/UI] 実際の画面操作でエピソード1の勝敗に到達できることを検証する。
 * 既定の選択（リン酸 / 標準 / 中温 / 標準処置）は会話のヒント通りの正解であり、
 * そのまま実行すれば完全修復になるはずである。
 */

async function gotoLab(user: ReturnType<typeof userEvent.setup>) {
  render(<App />)
  for (let i = 0; i < 9; i++) {
    await user.click(screen.getAllByRole('button', { name: /次へ/ })[0])
  }
  await user.click(screen.getAllByRole('button', { name: /処置に進む/ })[0])
}

describe('[EP01/UI] 勝敗の到達可能性', () => {
  it('既定の処置（ヒント通りの正解）で実行すると完全修復になる', async () => {
    const user = userEvent.setup()
    await gotoLab(user)

    // ラボのプレビューと実行結果が一致すること（プレビューでも完全修復相当）
    expect(screen.getAllByText(/PERFECT/)[0]).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /処置を実行する/ })[0])

    expect(screen.getAllByText(/完全修復/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/\+35/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/\+280G/)[0]).toBeInTheDocument()
  })

  it('塩酸・濃め・高温を選ぶとプレビューで危険警告が出て、実行すると事故になる', async () => {
    const user = userEvent.setup()
    await gotoLab(user)

    await user.click(screen.getAllByRole('button', { name: /塩酸/ })[0])
    await user.click(screen.getAllByRole('button', { name: /濃め/ })[0])
    await user.click(screen.getAllByRole('button', { name: /^高温/ })[0])

    expect(screen.getAllByText(/危険な組み合わせです/)[0]).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /処置を実行する/ })[0])

    expect(screen.getAllByText(/事故発生/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/-40/)[0]).toBeInTheDocument()
  })
})
