import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('[REQ-TALK-01] 線形対話 — 次へボタンで会話が進む', () => {
  it('初期画面に最初の対話ノードが表示される', () => {
    render(<App />)

    expect(screen.getAllByText(/砂塵舞う荒野の端/)[0]).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /次へ/ })[0]).toBeInTheDocument()
  })

  it('「次へ」ボタンを押すと次の対話ノードに進む', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getAllByRole('button', { name: /次へ/ })[0])

    expect(screen.getAllByText(/入り口の布を分けて/)[0]).toBeInTheDocument()
  })

  it('数回のクリックで最後のノードに到達し、処置に進むボタンが表示される', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (let i = 0; i < 9; i++) {
      await user.click(screen.getAllByRole('button', { name: /次へ/ })[0])
    }

    expect(screen.getAllByRole('button', { name: /処置に進む/ })[0]).toBeInTheDocument()
  })
})

describe('[REQ-LAB-01] ラボフェーズ — レシピセレクターが表示される', () => {
  it('対話終了後にラボフェーズに遷移する', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (let i = 0; i < 9; i++) {
      await user.click(screen.getAllByRole('button', { name: /次へ/ })[0])
    }

    await user.click(screen.getAllByRole('button', { name: /処置に進む/ })[0])

    expect(screen.getAllByText(/処置ラボ/)[0]).toBeInTheDocument()
  })

  it('試薬セレクターが表示される', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (let i = 0; i < 9; i++) {
      await user.click(screen.getAllByRole('button', { name: /次へ/ })[0])
    }

    await user.click(screen.getAllByRole('button', { name: /処置に進む/ })[0])

    expect(screen.getAllByText(/試薬/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/塩酸/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/クエン酸/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/リン酸/)[0]).toBeInTheDocument()
  })
})