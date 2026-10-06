---
name: "Risk Management Guide"
description: "Risk controls for the standalone React, Vite, and TypeScript frontend."
---

# リスク管理ガイド

## 1. 実装境界

- UI状態、純粋な計算、依存関係の境界を維持する。
- `src/lib/purityEngine.ts` からReact、DOM、外部API、Python、Flaskを除外する。
- 依存パッケージの更新は、変更差分、Lint、ビルド、テストを確認してから導入する。

## 2. ガードレール

- 1ターン最大3ファイルを基本とする。
- Green-to-Green: 変更前後のテストが通ることを確認する。
- UIと純粋計算の責務が混在しないことを確認する。
- `npm audit` の既知脆弱性は、利用可能な最小修正を優先して適用する。

## 3. ロールバック

- 品質ゲート失敗時は変更を分離し、直前のGreen状態へ戻す。
- `dist`生成物を変更する場合は、ソース変更と生成物変更の両方をレビューする。
- 依存関係を更新する場合は、更新前後のビルドとテスト結果を記録する。
