---
name: "Documentation Quality"
description: "Requirement, architecture, implementation, and test traceability for the standalone frontend."
---

# ドキュメント品質運用ガイド

## 1. トレーサビリティ

- 要求IDは`REQ-xxx`、設計IDは`ADR-xxx`として管理する。
- 要求、ADR、実装、テストの間で双方向追跡を維持する。
- テスト名または説明に対応する要求IDを含める。
- `src/lib/purityEngine.ts`、`src/App.tsx`、`tests/` の各変更が要求と設計のどこに対応するかを明記する。

## 2. 検証コマンド

```bash
npm run lint
npm run build
npm test
```

- Lint、TypeScript、Viteビルド、Vitestを実行する。
- 要求ID参照の欠落、設計ADRの不整合、未追跡テストをレビューする。
- Markdownのリンク切れと構造を確認する。

## 3. 変更時の必須

- 要求仕様変更時はADR、実装、テストを同じPRで更新する。
- 存在しない未追跡コードを作らない。
- 過去のADRを変更せず、Superseded状態を付与する。
