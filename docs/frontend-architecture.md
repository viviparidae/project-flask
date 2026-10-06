# Project: FLASK — React / Vite / TypeScript フロントエンド設計

- **ステータス**: Accepted
- **策定日**: 2026-10-06
- **対象**: 単独フロントエンド Web アプリ

## 1. 目的

Project: FLASK は、Python単体ではなく、React、Vite、TypeScriptを使用するスタンドアロンなフロントエンドとして提供する。UI、状態、決定論的な化学シミュレーションはブラウザ内で完結し、外部APIやサーバー依存を持たない。

## 2. 構成

```text
src/
├── App.tsx                 # 画面と状態フロー
├── main.tsx                 # React エントリーポイント
├── lib/
│   └── purityEngine.ts      # 純度・反応・設備制約の純粋計算
└── styles.css              # レスポンシブUI

tests/
├── App.test.tsx             # UIの受入テスト
└── purity-engine.test.ts    # 要求タゲットの計算テスト
```

## 3. 依存方向

- UIは `src/lib/purityEngine.ts` の公開APIのみを使用する。
- 純度計算は副作用を持たず、同じ入力に対して同じ結果を返す。
- フロントエンドは API、DB、Pythonプロセスに依存しない。
- browser storage、local state、React componentを使用するが、サーバー側の状態管理は行わない。

## 4. 要求追跡

| 要求ID | 受け入れテスト | 実装 |
| --- | --- | --- |
| REQ-CHEM-01〜04 | tests/purity-engine.test.ts | src/lib/purityEngine.ts |
| REQ-TALK-01 | tests/App.test.tsx | src/App.tsx |
| NFR-REPR-01 | tests/purity-engine.test.ts | src/lib/purityEngine.ts |

## 5. 実行

```bash
npm install
npm run dev
npm test
npm run build
npm run lint
```

## 6. 制約

- 既存のPython/Flask実装とAPI契約を使用しない。
- Viteの開発サーバーとビルド済み静的資産だけでアプリを実行する。
- 検証テストは、ブラウザの実コンポーネントを対象とする。
