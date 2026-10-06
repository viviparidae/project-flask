---
name: "React Vite TypeScript Frontend Architecture"
description: "React, Vite, TypeScript standalone frontend architecture, UI boundaries, pure functions, and quality gates for Project: FLASK."
---

# React / Vite / TypeScript フロントエンド設計

## 1. 目的

Project: FLASK は、Python / Flask のバックエンドを使用せず、ブラウザ内で完結するスタンドアロンフロントエンドとして実装する。UI、状態、経済・化学シミュレーションの責務を明確に分離する。

## 2. 構成

```text
src/
├── App.tsx                 # UIと操作フロー
├── main.tsx                 # Reactエントリーポイント
├── lib/
│   └── purityEngine.ts      # 純粋な純度計算
└── styles.css              # レスポンシブUI
```

## 3. 依存方向

```text
React UI -> Pure TypeScript Function
React UI -> Local State
Pure TypeScript Function -> No external dependency
```

- `App.tsx` は `purityEngine.ts` の公開APIだけを利用する。
- `purityEngine.ts` は React、DOM、外部API、Python、Flask、DBを参照しない。
- UIの状態は React state に限定し、サーバー状態を保持しない。
- 外部サービスが必要な場合は、アプリの外側でアダプタを追加する。

## 4. 品質ゲート

- `npm run lint`: ESLint警告0件
- `npm run build`: TypeScriptとVite本番ビルド成功
- `npm test`: Vitest全テスト成功
- `tests/App.test.tsx`: UI操作の受入テスト
- `tests/purity-engine.test.ts`: 要求IDと決定論性の検証

## 5. 要求追跡

- `REQ-CHEM-01〜04`: 純度計算
- `REQ-TALK-01`: 対話診断
- `NFR-PERF-01`: 応答性能
- `NFR-REPR-01`: 決定論性

## 6. ADR

- ADR-0003: React / Vite / TypeScript スタンドアロンフロントエンドの採用
- ADR-0001、およびADR-0002は新構成への置換後にSupersededとして扱う
