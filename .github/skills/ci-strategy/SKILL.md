---
name: "CI Strategy"
description: "Frontend-native quality gates for React, Vite, TypeScript, ESLint, Vitest, and production builds."
---

# CI 戦略（フロントエンド品質ゲート）

## 1. 品質ゲート

PRとマージ前は、以下を必須とする。

```bash
npm run lint
npm run build
npm test
```

- `npm run lint`: ESLintの警告・エラーが0件であること。
- `npm run build`: TypeScript strict checkとVite本番ビルドが成功すること。
- `npm test`: Vitestの全テストが成功すること。

## 2. 検証階層

1. **コミットステージ**: Lint、TypeScript、Vitestを実行する。
2. **統合ステージ**: 本番ビルドを実行し、生成物を検証する。
3. **リリース判定**: テスト失敗、Lint違反、ビルド失敗があればマージをブロックする。

## 3. テスト方針

- UI操作はTesting Libraryを使用する。
- 純度計算は`src/lib/purityEngine.ts`の公開APIを直接検証する。
- 外部サービスやブラウザAPIをモックしたテストは、実際のビジネス振る舞いを検証する。
- Vitestの並列実行は、`pool: 'forks'` または既定ワーカー構成を使用する。

## 4. 失敗時の扱い

- テストまたはLintが失敗した場合、同じ変更から品質ゲートを回避しない。
- ビルド生成物を変更した場合は、生成物の差分を確認する。
- 失敗原因が外部依存に由来する場合は、調査結果と再試行条件を記録する。
