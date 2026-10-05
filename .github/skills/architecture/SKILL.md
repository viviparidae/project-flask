---
name: "Clean Architecture & Design Guide for Flask"
description: "Comprehensive guide for Clean Code, Clean Architecture, C4 Model, Fitness Functions, and Architecture Decision Records (ADR) in Project: FLASK."
---

# アーキテクチャと設計原則 (Flask Clean Architecture Guide)

## 1. Clean Code 開発原則 (Clean Code Principles)

### 意図が明確な命名
- 変数・関数・クラス名は、それがなぜ存在するのか、何をするのか、どう使われるのかが伝わるように命名する[span_0](start_span)[span_0](end_span)。
- 暗号的な略称や、文脈がなければ意味を説明できない短縮名を使用しない（例: `usr_cnt` ではなく `user_count`）[span_1](start_span)[span_1](end_span)。

### 単一機能の関数と抽象化レベル (SLAP)
- 関数は短く保ち、1つのことだけを行う[span_2](start_span)[span_2](end_span)。
- 関数内の抽象化レベルを統一する（SLAP: Single Level of Abstraction Principle）[span_3](start_span)[span_3](end_span)。
- 副作用を持つ処理（I/O、DB操作、外部API呼び出し）と純粋な計算処理（ビジネスロジック）を分離する[span_4](start_span)[span_4](end_span)。

### 副作用の制御
- 関数宣言や名前から予期できない隠れた状態変化（グローバル変数の更新や引数オブジェクトの破壊的変更）を発生させない[span_5](start_span)[span_5](end_span)。
- 状態を変更する処理は責務と境界を明確にし、呼び出し側から挙動が把握できるようにする[span_6](start_span)[span_6](end_span)。

### マジックナンバー・文字列の排除
- 数値や制御文字列の直書きを禁止する[span_7](start_span)[span_7](end_span)。
- 必ず意図の伝わる名前付き定数や Enum へ抽出する（例: `src/constants.py` やドメイン列挙型）[span_8](start_span)[span_8](end_span)。

---

## 2. リファクタリング & 設計原則 (Refactoring & Design)

### コードの匂い（Code Smells）の排除
- **Long Function / Large Class**: 関数やクラスが肥大化した場合は、直ちに Extract Function / Extract Class で責務を分割する[span_9](start_span)[span_9](end_span)。
- **Feature Envy（機能の羨望）**: 他のオブジェクトのデータを主に使用している関数は、そのデータを持つ適切なモジュール/クラスへ Move Function する[span_10](start_span)[span_10](end_span)。
- **Primitive Obsession（基本型への執着）**: 識別子やドメイン上の意味を持つ値（例: `MoleculeId`, `Purity`）は、基本型（`str`, `float`）のまま回さず Value Object や Dataclass でカプセル化する[span_11](start_span)[span_11](end_span)。
- **Data Clumps（データの群れ）**: 常にセットで渡される引数群は、Dataclass や Struct へまとめる[span_12](start_span)[span_12](end_span)。

### リファクタリングの基本動作
- **Green-to-Green（緑から緑へ）**: 既存のテストがすべて合格（Pass）している状態を確認してから着手し、外部から見た振る舞いを変えずに内部構造だけを改善する[span_13](start_span)[span_13](end_span)。
- **Composed Method（構成されたメソッド）**: 上位の処理フローは、同じ抽象化レベルにある小さな関数呼び出しの組み合わせで構成する[span_14](start_span)[span_14](end_span)。

### アプリケーション設計原則
- **CQS (Command Query Separation)**:
  - **Command**: システムの状態を変更する操作（ビジネスロジックの実行等）[span_15](start_span)[span_15](end_span)。
  - **Query**: 状態を変更せず、データを取得・計算して返す操作[span_16](start_span)[span_16](end_span)。
  - 両者の責務を明確に分離し、Query 操作で副作用が発生しないようにする[span_17](start_span)[span_17](end_span)。
- **YAGNI (You Aren't Gonna Need It)**: 現在の要件にない将来の拡張性のためのオーバーエンジニアリングを避け、最善かつ最もシンプルな実装を選択する[span_18](start_span)[span_18](end_span)。
- **ユビキタス言語の反映**: 変数名・関数名・クラス名には、ドメイン（調合、元素、純度、患者等）の合意された語彙を正確に使用する[span_19](start_span)[span_19](end_span)。

---

## 3. アーキテクチャ記述方式 (Architecture Description Standard)

システムの構造と設計意図を明確にし、人間と AI エージェント間で解釈の差を発生させないため、以下の記述標準（C4 Model 準拠）を採用する[span_20](start_span)[span_20](end_span)。

### 3.1. C4 Model による構造記述
アーキテクチャの文書化（`docs/architecture/` 内）には以下を適用する[span_21](start_span)[span_21](end_span)：
- **Context Diagram (システムコンテキスト文脈)**: ユーザー（プレイヤー）、システム外部（外部API、ローカルストレージ）との関係[span_22](start_span)[span_22](end_span)。
- **Container Diagram (コンテナ構成)**: Flask Webサーバー、フロントエンドUI、データベース（SQLite/PostgreSQL）の物理・論理的配置[span_23](start_span)[span_23](end_span)。
- **Component Diagram (コンポーネント構成)**: 各レイヤー（Domain, UseCase, Adapter, Infrastructure）内部のモジュール構造と依存関係[span_24](start_span)[span_24](end_span)。

### 3.2. C4-PlantUML / Mermaid によるコード化 (Diagrams as Code)
図表はバイナリ画像ではなく、リポジトリ内でバージョン管理可能な **Mermaid** または **PlantUML** テキスト形式で記述する[span_25](start_span)[span_25](end_span)。

```mermaid
graph TD
    UI[Flask Routes / Adapters] --> UseCase[Use Cases]
    UseCase --> Domain[Domain Layer]
    Infra[Infrastructure / SQLAlchemy] --> UseCase
    Infra --> Domain

4. Clean Architecture & Flask レイヤー設計原則
レイヤー構造と依存方向のルール
システムは以下の層で構成され、依存の方向は必ず外側から内側（Domain）に向かわなければならない。
 * Domain Layer (コア領域 / src/domain/)
   * エンティティ、値オブジェクト（Value Object）、ドメインサービス。
   * ルール: 他のいかなる層（Flask、SQLAlchemy、外部API等）にも依存してはならない。純粋な Python コード（標準ライブラリのみ）で記述する。
 * Use Case Layer (応用層 / src/usecases/)
   * アプリケーション固有のユースケース（ビジネスフローの組み立て）。
   * ルール: Domain 層のみに依存する。DBや外部サービスへのアクセスは抽象（Interface/Protocol）を介して行う。
 * Interface / Adapter Layer (src/adapters/ & src/routes/)
   * Flask の Route（Blueprint）、リクエスト/レスポンスのスキーマ（Pydantic等）、リポジトリの実装。
   * ルール: Use Case 層を呼び出し、HTTPとドメインモデルの変換を行う。
 * Infrastructure Layer (src/infrastructure/)
   * データベース（SQLAlchemy）、外部APIクライアント、ファイルI/Oの具体実装。
境界の保護と依存性逆転 (DIP)
 * Flask依存の隔離: flask.request や jsonify などの Web 枠組み依存処理は、Route/Controller 層（最外層）の中に閉じ込め、Use Case や Domain 層へ侵入させない。
 * DB/ORマッパーの隔離: SQLAlchemy の Model オブジェクトを直接ドメインロジック内で操作しない。リポジトリパターン（Repository Pattern）を挟み、Domain エンティティに変換して扱う。

## 5. 適合度関数による自動検証 (Fitness Functions)

「進化的アーキテクチャ（Evolutionary Architecture）」の原則に基づき、アーキテクチャの境界保護やコード品質を人間のレビューに頼らず**自動テスト・静的解析（Fitness Functions）**でガードレールとして運用する[span_0](start_span)[span_0](end_span)。

### 5.1. 依存方向の自動検証 (Architectural Fitness Functions)
- **Import 境界テスト (pytest + import-linter)**:
  - CI パイプライン上で `import-linter` 等の静的テストを実行する[span_1](start_span)[span_1](end_span)。
  - `src/domain/` 内のコードが `flask`, `sqlalchemy`, `src.adapters`, `src.infrastructure` をインポートしている場合、ビルドを強制失敗（Fail）させる[span_2](start_span)[span_2](end_span)。

---

### 5.2. コード品質とカバレッジの適合度検証 (Quality & Coverage Fitness Functions)

カバレッジ数値の「見せかけの達成（目的化）」を防ぐため、**レイヤー別にカバレッジ閾値を分離定義し、`pytest-cov` で自動計測・ガードレール化**する。

| レイヤー | 測定対象 | ブランチカバレッジ目標 | 理由・運用方針 |
| :--- | :--- | :--- | :--- |
| **Domain Layer** (`src/domain/`) | 純粋ロジック・純度計算・値オブジェクト | **95% 以上** | システムの核であり、外部依存を持たないため高カバレッジを維持しやすい[span_3](start_span)[span_3](end_span)。 |
| **Use Case Layer** (`src/usecases/`) | アプリケーションフロー・ドメイン連携 | **85% 以上** | ソーシャル単体テスト / 統合テストにより、条件分岐（Branch Coverage）を中心に検証。 |
| **Adapter / Route** (`src/routes/`) | Flask HTTPリクエスト/レスポンス変換 | **70% 以上** | 正常系・主要エラー系の変換ロジックをカバー。 |
| **Infrastructure** (`src/infrastructure/`) | DBリポジトリ・外部APIクライアント | **70% 以上** | 永続化統合テスト / ゲートウェイ統合テストで実挙動をカバー。 |

#### カバレッジ適合度関数の CI 設定ルール (`pyproject.toml` / `pytest.ini`)
CI 上で以下のコマンドを実行し、規定の閾値を下回った場合は PR のビルドを失敗（Fail）させる：

```bash
# ドメイン層のブランチカバレッジ95%未満で自動Fail
pytest --cov=src/domain --cov-branch --cov-fail-under=95 tests/unit/domain

# 全体のブランチカバレッジ80%未満で自動Fail
pytest --cov=src --cov-branch --cov-fail-under=80 tests/

 * C1 (Branch Coverage) の優先: 単なる行網羅（Line Coverage）ではなく、分岐網羅（Branch Coverage）を検証対象とし、純度判定（大成功 / 成功 / 失敗）などの条件分岐が漏れなくテストされていることを保証する。
 * リファクタリング時の耐性: 内部のプライベート関数追加によってカバレッジが低下しないよう、公開インターフェース（観測可能な振る舞い）経由のテストでカバレッジを維持する。
5.3. 静的解析の適合度検証 (Static Quality Fitness Functions)
 * 型安全率 (mypy):
   * Domain 層および Use Case 層では mypy --strict を全件 Pass させる。
 * 巡回複雑度 (Cyclomatic Complexity - radon / flake8):
   * 1つの関数の巡回複雑度は 10以下 に維持する。10を超える関数が存在する場合、CI 段階で警告またはエラーとする。
 * レイヤー間モジュール結合度:
   * src/domain から外部パッケージへの不要な直接結合（サードパーティ製ライブラリの過剰利用）を検出し、標準ライブラリ中心の純粋性を保護する。

---

### カバレッジを適合度関数に組み込むメリット

1. **レイヤーごとの傾斜配分**:
   ビジネスロジックが集約された Domain 層には `95%` の高い基準を課し、I/O やフレームワークに依存する最外層には現実的な `70%` の閾値を設けることで、テスト記述のコストパフォーマンス（ROI）を極大化できます。
2. **`--cov-branch`（分岐カバレッジ）の適用**:
   `if` や `match-case` などのすべての分岐ルートを追跡するため、「行だけを通した薄いテスト」を無効化し、純度判定やフラグ分岐のテスト漏れを自動で検知できます。



5. 適合度関数による自動検証 (Fitness Functions)
「進化的アーキテクチャ（Evolutionary Architecture）」の原則に基づき、アーキテクチャの境界保護やコード品質を人間のレビューに頼らず自動テスト・静的解析（Fitness Functions）でガードレールとして運用する。
5.1. 依存方向の自動検証 (Architectural Fitness Functions)
 * Import 境界テスト (pytest + import-linter):
   * CI パイプライン上で import-linter 等の静的テストを実行する。
   * src/domain/ 内のコードが flask, sqlalchemy, src.adapters, src.infrastructure をインポートしている場合、ビルドを強制失敗（Fail）させる。
; .importlinter の設定例
[importlinter]
root_package = src

[importlinter:contract:domain-isolation]
name = Domain layer must not import external layers
type = forbidden
forbidden_modules =
    flask
    sqlalchemy
    src.adapters
    src.infrastructure
layers =
    src.domain

5.2. 静的コード品質の適合度検証 (Quality Fitness Functions)
 * 型安全率 (mypy):
   * Domain 層および Use Case 層では mypy --strict を全件 Pass させる。
 * 巡回複雑度 (Cyclomatic Complexity - radon / flake8):
   * 1つの関数の巡回複雑度は 10以下 に維持する。10を超える関数が存在する場合、CI 段階で警告またはエラーとする。
 * レイヤー間モジュール結合度:
   * src/domain から外部パッケージへの不要な直接結合（サードパーティ製ライブラリの過剰利用）を検出し、標準ライブラリ中心の純粋性を保護する。
6. アーキテクチャ決定記録 (Architecture Decision Records: ADR)
重要な意思決定（アーキテクチャスタイルの選定、フレームワークやライブラリの採用・改変など）は、すべて ADR（Architecture Decision Record） として文書化し、リポジトリ (docs/adr/) 内でコードとともにバージョン管理する。
6.1. ADR 運用ルール
 * 履歴の改ざん禁止: 過去の決定事項を直接書き換えず、仕様変更時は新たな ADR を作成して古い ADR を Superseded に更新する。
 * AI エージェントへの制約提示: Roo Code などの AI エージェントは、過去の ADR と矛盾するコード生成やライブラリ追加を行ってはならない。
6.2. ADR 標準フォーマット (docs/adr/NNNN-title.md)
# [ADR-NNNN] [決定事項のタイトルの簡潔な記述]

* **ステータス**: [提案中 (Proposed) | 承認 (Accepted) | 廃止 (Deprecated) | 置換 (Superseded by ADR-XXXX)]
* **決定者**: [開発者名 / チーム名]
* **日付**: YYYY-MM-DD

## 1. 文脈と問題提起 (Context & Problem Statement)
[どのような問題が発生したか、またはどのような新機能・変更が必要になったのかの背景]

## 2. 検討した選択肢 (Considered Options)
* **選択肢 A**: [概要とメリット・デメリット]
* **選択肢 B**: [概要とメリット・デメリット]

## 3. 決定と根拠 (Decision Outcome & Rationale)
[どの選択肢を選んだかと、その主たる理由。トレードオフを明記]

## 4. 評価と結果 (Consequences)
### 正の影響 (Positive Consequences)
* [得られるメリット]
### 負の影響 / リスク (Negative Consequences / Risks)
* [新たに生じる制約、運用コストなど]

## 5. 適合度関数 / 検証基準 (Fitness Functions & Validation)
* [この決定が守られているかを自動検証する方法（例: 自動テスト、import-linter等）]

7. 増分変更と CI ガバナンス (Governance)
 * 増分変更 (Incremental Change): 機能変更やリファクタリングは小さなコミット単位に分け、互換性を保ちながら実装と自動テストを繰り返す。
 * CI 品質ゲート (Quality Gate): PR 作成時、単体テスト・結合テストの全件 Pass に加え、上記の適合度関数（Fitness Functions）の検証を自動パスすることを必須とする。

