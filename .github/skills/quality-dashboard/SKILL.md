---
name: "Quality Dashboard"
description: "Dynamic frontend quality metrics using npm, ESLint, TypeScript, Vite, and Vitest."
---

# 動的品質ダッシュボード

## 1. 収集対象

| 指標 | 収集元 | 目標 |
| --- | --- | --- |
| Lint | `npm run lint` | 警告・エラー0件 |
| ビルド | `npm run build` | 成功 |
| テスト | `npm test` | 全テスト成功 |
| テスト密度 | `tests/` | 要求ごとに検証 |
| カバレッジ | Vitest coverage | 変更対象の分岐を検証 |
| 依存安全性 | `npm audit` | 重大な脆弱性を解消 |

## 2. 運用ルール

- CIはLint、ビルド、テストを順に実行する。
- テスト失敗、ビルド失敗、重大な依存脆弱性を品質低下として記録する。
- 変更前後の品質指標を比較し、品質低下の原因を特定する。
- Python/Flaskの旧CI構成を再利用しない。
