# Copilot Instructions

## 前提条件

- **回答は必ず日本語でしてください。**

## 基本方針

- `copilot-instructions.md` には全体共通ルールおよび各スキルの役割インデックスのみを記載する。
- 詳細な専門ドメイン・設計知識は `.github/skills/*/SKILL.md` に分離し、状況に応じて該当スキルを参照して作業を行う。
- コミット時は `conventional-commits` スキルに従い、適切なプレフィックス（`feat`, `fix`, `docs`, `refactor` 等）を付与する。

## プロジェクト概要

『Project: FLASK』は、Clean Architecture に基づく Python / Flask によるバックエンドシステムおよびドメインエンジンプロジェクトである。

### 技術スタック概要
- **言語**: Python 3.11+
- **フレームワーク**: Flask (Web API / Routing)
- **アーキテクチャ**: Clean Architecture (Domain, UseCases, Adapters, Infrastructure)
- **テスト**: pytest, pytest-cov, Testcontainers
- **静的解析・品質保証**: mypy (--strict), ruff / flake8, import-linter (Fitness Functions)
- **ドキュメント・要件管理**: MkDocs, Mermaid, Gherkin / BDD, 実例マッピング (Example Mapping)
- **メトリクス・可視化**: DORA 4 Keys, 動的品質ダッシュボード

### ディレクトリ構成概略
- `src/domain/`: 純粋なドメインモデル・ビジネスロジック（外部依存禁止）
- `src/usecases/`: アプリケーションユースケースフロー
- `src/adapters/` / `src/routes/`: Flask Blueprint, HTTP リクエスト/レスポンス変換
- `src/infrastructure/`: DB (SQLAlchemy), 外部サービス連携
- `tests/`: 8つのテストレベルに応じたテストスイート（unit, component, integration, e2e, acceptance）
- `docs/`: 要件データ (`docs/requirements/`), 設計書 (`docs/architecture/`), ADR (`docs/adr/`), メトリクス履歴 (`docs/metrics/`)
- `.github/skills/`: 各種設計・運用ガイドライン（Skills）

## スキル一覧と参照タイミング (Skills Index)

作業内容に応じて、以下の専門スキルを必ず参照すること。

1. **要件定義・仕様確認**: `.github/skills/requirements-development/SKILL.md`
   - 要求 ID (`REQ-xxx`) の付与、BRIEF 原則、実例マッピング (Example Mapping)、Given-When-Then 記述、品質シナリオ定義。
2. **アーキテクチャ・設計・実装**: `.github/skills/architecture/SKILL.md`
   - Clean Architecture の依存方向ルール、Fitness Functions、ADR、C4 Model。
3. **テスト実装・検証方針**: `.github/skills/test-strategy/SKILL.md`
   - 8 つのテストレベル（受け入れテストと E2E テストの分離）、テストピラミッド、Flaky 防止。
4. **CI / デリバリー戦略**: `.github/skills/ci-strategy/SKILL.md`
   - コミットステージと統合ステージの段階的検証、品質ゲート通過基準、DORA 4 Keys 測定、キャッシュ戦略。
5. **動的品質ダッシュボード**: `.github/skills/quality-dashboard/SKILL.md`
   - カバレッジ・テスト健全性・4 Keys・負債推移の動的可視化、時系列トレンド早期警戒。
6. **リスク管理・ガードレール**: `.github/skills/risk-management/SKILL.md`
   - 1ターン3ファイル原則、Green-to-Green、シークレット漏洩防止、ロールバック基準。
7. **コミットメッセージ**: `.github/skills/conventional-commits/SKILL.md`
   - Conventional Commits 形式 (`type(scope): subject`) の厳格運用。
8. **ドキュメント品質管理**: `.github/skills/document-quality/SKILL.md`
   - ISO/IEC 29148 整合性、トレーサビリティ検証、MkDocs ポータル。
