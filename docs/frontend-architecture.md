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
├── main.tsx                 # Reactエントリーポイント
├── lib/
│   ├── dialogueEngine.ts    # 線形対話エンジン
│   ├── recipeEngine.ts      # レシピ選択・照合エンジン
│   ├── reactionEngine.ts    # 酸洗浄反応計算エンジン
│   ├── fateEngine.ts        # 因果判定エンジン
│   └── purityEngine.ts      # 純度・反応・設備制約の純粋計算
└── styles.css              # レスポンシブUI

tests/
├── App.test.tsx             # UIの受入テスト
├── dialogue-engine.test.ts  # 対話エンジンテスト
├── recipe-engine.test.ts    # レシピエンジンテスト
├── reaction-engine.test.ts  # 反応エンジンテスト
├── fate-engine.test.ts      # 因果判定テスト
└── purity-engine.test.ts    # 要求ターゲットの計算テスト
```

## 3. 依存方向

- `App.tsx` は `dialogueEngine.ts`, `recipeEngine.ts`, `reactionEngine.ts`, `fateEngine.ts`, `purityEngine.ts` の公開APIのみを使用する。
- `purityEngine.ts` はReact、DOM、外部API、Python、Flaskを参照しない。
- 純度計算は副作用を持たず、同じ入力に対して同じ結果を返す。
- フロントエンドは API、DB、Pythonプロセスに依存しない。
- browser storage、local state、React componentを使用するが、サーバー側の状態管理は行わない。

## 4. 要求追跡

| 要求ID | 受け入れテスト | 実装 |
| --- | --- | --- |
| REQ-CHEM-01〜04 | tests/purity-engine.test.ts | src/lib/purityEngine.ts |
| REQ-TALK-01 | tests/App.test.tsx | src/App.tsx |
| REQ-FATE-01〜04 | tests/fate-engine.test.ts | src/lib/fateEngine.ts |
| REQ-ATOM-01〜04 | tests/recipe-engine.test.ts | src/lib/recipeEngine.ts |
| REQ-LAB-01〜04 | tests/purity-engine.test.ts | src/lib/purityEngine.ts |
| NFR-PERF-01 | tests/reaction-engine.test.ts | src/lib/reactionEngine.ts |
| NFR-REPR-01 | tests/purity-engine.test.ts | src/lib/purityEngine.ts |
| NFR-INTEG-01 | tests/fate-engine.test.ts | src/lib/fateEngine.ts |
| NFR-GRAPH-01 | tests/recipe-engine.test.ts | src/lib/recipeEngine.ts |
| NFR-CONFIG-01 | tests/purity-engine.test.ts | src/lib/purityEngine.ts |
| NFR-NARR-01 | tests/dialogue-engine.test.ts | src/lib/dialogueEngine.ts |

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
