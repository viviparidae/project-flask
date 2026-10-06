# Project: FLASK

**React / Vite / TypeScript スタンドアロンフロントエンド**として構築されています。

## 構成

- React: UIと状態フロー
- Vite: 開発サーバーと静的ビルド
- TypeScript: 型安全なドメインモデルとUI
- Vitest / Testing Library: UI・純度計算テスト

## 起動

```bash
npm install
npm run dev
```

ブラウザで表示されるアプリは、外部API・Python・Flaskを必要としません。

## 検証

```bash
npm test
npm run build
npm run lint
```

## 要求

既存の化学・対話・純度要求は、[docs/requirements.md](docs/requirements.md) と [docs/frontend-architecture.md](docs/frontend-architecture.md) に定義されています。
