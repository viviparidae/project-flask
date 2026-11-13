# Project: FLASK — ドキュメントインデックス

> **最終更新**: 2026-11-11  
> **現行アーキテクチャ**: Phaser 3 + Vite + TypeScript（[ADR-0004](./adr/0004-phaser-game-engine-migration.md)）

---

## 📋 要求・仕様

| ドキュメント | 概要 | ステータス |
|-------------|------|------------|
| [`vision-and-scope.md`](./vision-and-scope.md) | ビジョン・スコープ定義書（Phaser 版） | ✅ Updated |
| [`requirements.md`](./requirements.md) | 機能/非機能要求一覧・トレーサビリティ | ✅ Current |
| [`game-architecture.md`](./game-architecture.md) | Phaser ゲームアーキテクチャ設計 | ✅ New (was frontend-architecture.md) |
| [`architecture.md`](./architecture.md) | システム全体アーキテクチャ（C4 + ADR 参照） | ✅ Updated |

---

## 🏗️ ADR（アーキテクチャ決定記録）

| ADR | タイトル | ステータス | 備考 |
|-----|----------|------------|------|
| [ADR-0003](./adr/0003-react-vite-standalone-frontend.md) | React/Vite/TS スタンドアロンフロントエンド | **Superseded** | ADR-0004 で置換 |
| [ADR-0004](./adr/0004-phaser-game-engine-migration.md) | **Phaser ゲームエンジンへの移行** | **Proposed** | **現行決定** |
| [ADR-0001](./adr/archived/0001-clean-architecture-adoption.md) | Clean Architecture 採用 | Archived | Python/Flask 前提の旧決定 |
| [ADR-0002](./adr/archived/0002-deterministic-purity-engine.md) | 決定論的純度エンジン | Archived | 純粋ロジック層として継承済み |

> **ルール**: Superseded/Archived ADR は `adr/archived/` へ移動。`architecture.md` の ADR 一覧のみ更新すればよい。

---

## 📖 ストーリー・世界観

| ドキュメント | 概要 | ステータス |
|-------------|------|------------|
| [`story/story-bible.md`](./story/story-bible.md) | 世界観・主人公・キャラ・エピソード一覧・化学ルール・評判システム | ✅ Complete |
| [`story/characters.md`](./story/characters.md) | 主人公・ガルド・ナーラ・オルベン等キャラ詳細・セリフ集 | ✅ Complete |
| [`story/ep01-ancient-sword.md`](./story/ep01-ancient-sword.md) | Ep.1「古剣の腐食」シナリオ詳細（対話ツリー・パラメータ・分岐） | ✅ Implemented |

---

## 🧪 実例マッピング（Example Mapping）

| ドキュメント | 対象要求 | ステータス |
|-------------|----------|------------|
| [`requirements/example-mappings/aspirin-purification.md`](./requirements/example-mappings/aspirin-purification.md) | REQ-CHEM-01〜04 | ✅ |
| [`requirements/example-mappings/dialogue-consultation.md`](./requirements/example-mappings/dialogue-consultation.md) | REQ-TALK-01 | ✅ |
| [`requirements/example-mappings/drug-dispensation.md`](./requirements/example-mappings/drug-dispensation.md) | REQ-FATE-01〜04 | ✅ |
| [`requirements/example-mappings/lab-progression.md`](./requirements/example-mappings/lab-progression.md) | REQ-LAB-01〜04 | ✅ |
| [`requirements/example-mappings/molecular-synthesis.md`](./requirements/example-mappings/molecular-synthesis.md) | REQ-ATOM-01〜04 | ✅ |

---

## 🔗 クイックリンク

- **純粋ロジック実装**: `src/lib/` （`dialogueEngine.ts`, `recipeEngine.ts`, `reactionEngine.ts`, `fateEngine.ts`, `purityEngine.ts`）
- **現行 React 実装**: `src/App.tsx` （Phaser 移植時の参照用）
- **テスト**: `tests/` （純粋ロジックテストは Phaser 移行後も継続）
- **Phaser 移植ブランチ**: `git checkout phaser-rewrite`

---

## 📝 更新履歴

| 日付 | 変更内容 | 担当 |
|------|----------|------|
| 2026-11-11 | ADR-0004 策定、vision-and-scope/architecture/game-architecture 更新、ADR-0001/0002 アーカイブ | Hermes Agent |
| 2026-10-15 | story-bible.md / characters.md / ep01-ancient-sword.md 作成 | — |
| 2026-10-06 | 初版要求・アーキテクチャ・ADR-001〜003 策定 | — |