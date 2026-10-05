---
name: "Clean Architecture Guide for Flask"
description: "Guidance for preserving clean separation of concerns, dependency direction, and boundary protection in a Flask-based application."
---

# アーキテクチャと設計原則 (Flask Clean Architecture Guide)

## 1. Clean Code 開発原則

### 意図が明確な命名
- 変数・関数・クラス名は、それがなぜ存在するのか、何をするのか、どう使われるのかが伝わるように命名する。
- 暗号的な略称や、文脈がなければ意味を説明できない短縮名を使用しない（例: `usr_cnt` ではなく `user_count`）。

### 単一機能の関数と抽象化レベル
- 関数は短く保ち、1つのことだけを行う。
- 関数内の抽象化レベルを統一する（SLAP: Single Level of Abstraction Principle）。
- 副作用を持つ処理（I/O、DB操作、外部API呼び出し）と純粋な計算処理（ビジネスロジック）を分離する。

### 副作用の制御
- 関数宣言や名前から予期できない隠れた状態変化（グローバル変数の更新や引数オブジェクトの破壊的変更）を発生させない。
- 状態を変更する処理は責務と境界を明確にし、呼び出し側から挙動が把握できるようにする。

### マジックナンバー・文字列の排除
- 数値や制御文字列の直書きを禁止する。
- 必ず意図の伝わる名前付き定数や Enum へ抽出する（例: `src/constants.py` やドメイン列挙型）。

---

## 2. リファクタリング & 設計原則

### コードの匂い（Code Smells）の排除
- **Long Function / Large Class**: 関数やクラスが肥大化した場合は、直ちに Extract Function / Extract Class で責務を分割する。
- **Feature Envy（機能の羨望）**: 他のオブジェクトのデータを主に使用している関数は、そのデータを持つ適切なモジュール/クラスへ Move Function する。
- **Primitive Obsession（基本型への執着）**: 識別子やドメイン上の意味を持つ値（例: Email, Money, MoleculeId）は、基本型（str, int）のまま回さず Value Object や型エイリアス/Dataclass でカプセル化する。
- **Data Clumps（データの群れ）**: 常にセットで渡される引数群は、Dataclass や Struct へまとめる。

### リファクタリングの基本動作
- **Green-to-Green（緑から緑へ）**: 既存のテストがすべて合格（Pass）している状態を確認してから着手し、外部から見た振る舞いを変えずに内部構造だけを改善する。
- **Composed Method（構成されたメソッド）**: 上位の処理フローは、同じ抽象化レベルにある小さな関数呼び出しの組み合わせで構成する。

### アプリケーション設計原則
- **CQS (Command Query Separation)**: 
  - **Command**: システムの状態を変更する操作（ビジネスロジックの実行等）。
  - **Query**: 状態を変更せず、データを取得・計算して返す操作。
  - 両者の責務を明確に分離し、Query 操作で副作用が発生しないようにする。
- **YAGNI (You Aren't Gonna Need It)**: 現在の要件にない将来の拡張性のためのオーバーエンジニアリングを避け、最善かつ最もシンプルな実装を選択する。
- **ユビキタス言語の反映**: 変数名・関数名・クラス名には、ドメイン（例: 調合、元素、純度、患者、症例等）の合意された語彙を正確に使用する。

---

## 3. Clean Architecture & Flask レイヤー設計原則

### レイヤー構造と依存方向のルール
システムは以下の層で構成され、**依存の方向は必ず外側から内側（Domain）に向かわなければならない**。

1. **Domain Layer (コア領域 / `src/domain/`)**
   - エンティティ、値オブジェクト（Value Object）、ドメインサービス。
   - **ルール**: 他のいかなる層（Flask、SQLAlchemy、外部API等）にも依存してはならない。純粋な Python コードで記述する。
2. **Use Case Layer (応用層 / `src/usecases/`)**
   - アプリケーション固有のユースケース（ビジネスフローの組み立て）。
   - **ルール**: Domain 層のみに依存する。DBや外部サービスへのアクセスは抽象（Interface/Protocol）を介して行う。
3. **Interface / Adapter Layer (`src/adapters/` & `src/routes/`)**
   - Flask の Route（Blueprint）、リクエスト/レスポンスのスキーマ（Pydantic等）、リポジトリの実装。
   - **ルール**: Use Case 層を呼び出し、HTTPとドメインモデルの変換を行う。
4. **Infrastructure Layer (`src/infrastructure/`)**
   - データベース（SQLAlchemy）、外部APIクライアント、ファイルI/Oの具体実装。

### 境界の保護と依存性逆転 (DIP)
- **Flask依存の隔離**: `flask.request` や `jsonify` などの Web 枠組み依存処理は、Route/Controller 層（最外層）の中に閉じ込め、Use Case や Domain 層へ侵入させない。
- **DB/ORマッパーの隔離**: SQLAlchemy の Model オブジェクトを直接ドメインロジック内で操作しない。リポジトリパターン（Repository Pattern）を挟み、Domain エンティティに変換して扱う。

---

## 4. 進化的アーキテクチャ & 保護（Fitness Functions）

### 増分変更（Incremental Change）
- 機能変更やリファクタリングは小さなコミット単位に分け、互換性を保ちながら実装と自動テストを繰り返す。

### ガードレールと境界の自動検証
- モジュール間の不適切な依存（例: Domain 層からの Flask インポート）が発生していないかを、静的解析ツール（`flake8`, `mypy`, `pylint` 等）やアーキテクチャテストで自動チェック可能な状態を維持する。
