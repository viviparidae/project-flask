import { Game } from './game/Game'

// Vite の HMR 対応（開発時のみ）
if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.dispose(() => {
    window.location.reload()
  })
}

// グローバルエラーハンドリング
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.message, e.filename, e.lineno, e.colno, e.error)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Rejection]', e.reason)
})

// ゲーム起動（グローバルに保存してデバッグ用にアクセス可能にする）
try {
  console.log('[main.ts] Creating Game instance...')
  const gameInstance = new Game()
  ;(window as any).__GAME__ = gameInstance
  console.log('[main.ts] Game instance created:', gameInstance)
} catch (e) {
  console.error('[main.ts] Game creation failed:', e)
}