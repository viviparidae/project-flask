import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// vitest の globals が無効なため、Testing Library の自動クリーンアップが
// 働かない。各テスト後に必ず unmount し、前のテストの DOM を残さない。
afterEach(() => {
  cleanup()
})
