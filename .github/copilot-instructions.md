# Copilot Instructions

## 前提条件

- **回答は必ず日本語でしてください。**

## 基本方針

- `copilot-instructions.md` には全体共通ルールおよび各スキルの役割インデックスのみを記載する。
- 詳細な専門ドメイン・設計知識は `.github/skills/*/SKILL.md` に分離し、状況に応じて該当スキルを参照して作業を行う。
- コミット時は `conventional-commits` スキルに従い、適切なプレフィックス（`feat`, `fix`, `docs`, `refactor` 等）を付与する。

## プロジェクト概要

『Project: FLASK』は、React、Vite、TypeScriptを使用したスタンドアロンなフロントエンドWebアプリである。Python / Flaskのバックエンドは使用しない。

### 技術スタック概要
- **言語**: TypeScript 5.7+、JavaScript
- **フレームワーク**: React 18、Vite
- **アーキテクチャ**: UI / State / Pure Function / Testing Library
- **テスト**: Vitest、Testing Library、jsdom
- **品質保証**: TypeScript strict、ESLint、Vite本番ビルド
- **ドキュメント・要件管理**: MkDocs、Mermaid、Gherkin / BDD、実例マッピング (Example Mapping)

### ディレクトリ構成概略
- `src/`: Reactコンポーネント、エントリーポイント、純粋な計算関数
- `src/lib/`: 決定論的なドメイン計算
- `tests/`: UI・純度計算の受け入れテスト
- `docs/`: 要件データ (`docs/requirements/`), 設計書 (`docs/architecture.md`), ADR (`docs/adr/`)
- `.github/skills/`: 各種設計・運用ガイドライン（Skills）

## スキル一覧と参照タイミング (Skills Index)

作業内容に応じて、以下の専門スキルを必ず参照すること。

1. **要件定義・仕様確認**: `.github/skills/requirements-development/SKILL.md`
   - 要求 ID (`REQ-xxx`) の付与、BRIEF 原則、実例マッピング (Example Mapping)、Given-When-Then 記述、品質シナリオ定義。
2. **アーキテクチャ・設計・実装**: `.github/skills/architecture/SKILL.md`
   - React/Viteのフロントエンド境界、純粋関数、依存方向、ADR、C4 Model。
3. **テスト実装・検証方針**: `.github/skills/test-strategy/SKILL.md`
   - UI、純度計算、受け入れテスト、E2Eテストの分離、Flaky防止。
4. **CI / デリバリー戦略**: `.github/skills/ci-strategy/SKILL.md`
   - npm test、TypeScript、ESLint、Vite buildの段階的検証、品質ゲート通過基準。
5. **リスク管理・ガードレール**: `.github/skills/risk-management/SKILL.md`
   - 1ターン3ファイル原則、Green-to-Green、フロントエンド依存の管理、ロールバック基準。
6. **コミットメッセージ**: `.github/skills/conventional-commits/SKILL.md`
   - Conventional Commits 形式 (`type(scope): subject`) の厳格運用。
7. **ドキュメント品質管理**: `.github/skills/document-quality/SKILL.md`
   - ISO/IEC 29148 整合性、トレーサビリティ検証、MkDocs ポータル。
