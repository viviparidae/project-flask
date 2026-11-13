import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [], // React プラグイン不要（Phaser 純粋実装）
  server: {
    host: '0.0.0.0', // LAN アクセス許可
    port: 5173,
  },
  build: {
    target: 'es2022',
    minify: 'esbuild',
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.test.ts', 'src/lib/**/*.test.ts'],
  },
})