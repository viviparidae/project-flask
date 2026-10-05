---
name: "Testing Strategy Guide"
description: "Test level taxonomy (Solo/Social Unit, Persistence/Gateway Integration, E2E, Acceptance) and behavioral validation guidelines."
---

# テスト戦略 (Testing Strategy)

## 1. 目的と要求追跡性 (Traceability & Objectives)

- **要求追跡**: 要求 ID (例: `REQ-CHEM-01`) ごとに、対応する受け入れテストおよび E2E/統合テストを追跡可能にする[span_0](start_span)[span_0](end_span)。
- **カバレッジ保証**: すべての要求事項について、少なくとも 1 件の受け入れテストまたは E2E テストが存在することを保証する。
- **品質ゲート**: PR 提出時に CI 上で各テストレベルの自動テストが全件 Pass し、要求 ID の網羅状態がレポートされることを維持する。

---

## 2. テストレベルの定義と責務 (Test Levels Taxonomy)

当プロジェクトでは、テストの結合度と検証目的に応じて以下の 6 つのテストレベルを明確に分離して運用する。

| テストレベル | 対象範囲・定義 | モック/インフラ | 主な検証目的 |
| :--- | :--- | :--- | :--- |
| **ソロ単体テスト**<br>*(Solo Unit Test)* | 単一のクラス・関数・Value Object[span_1](start_span)[span_1](end_span)。他オブジェクトから独立した純粋な計算ロジック。 | 他依存はすべてモック化または排除 | 複雑な計算・純度計算式・計算アルゴリズムの正当性[span_2](start_span)[span_2](end_span)。 |
| **ソーシャル単体テスト**<br>*(Social Unit Test)* | 複数のドメインオブジェクト（エンティティ、ドメインサービス）の連携。 | ドメイン内部は本物。外部I/Oのみ遮断 | ドメインモデル間の状態遷移や複合的なビジネスルールの検証[span_3](start_span)[span_3](end_span)。 |
| **永続化統合テスト**<br>*(Persistence Integration Test)* | リポジトリ層、ORマッパー、データベース (SQLite/PostgreSQL等) の連携。 | 実際の検証用DB (In-Memory/Test DB) | SQLクエリの正当性、スキーマ整合性、トランザクション境界の検証。 |
| **ゲートウェイ統合テスト**<br>*(Gateway Integration Test)* | 外部 Web API クライアント、外部サービスとの通信境界 (HTTP/gRPC/SDK)。 | WireMock / MSW またはテスト用エンドポイント | ネットワークエラー、シリアライズ/デシリアライズ、API契約の検証。 |
| **E2E テスト**<br>*(End-to-End Test)* | UI (フロントエンド) からバックエンド、DB までの貫通テスト。 | 実際のシステム全体環境 | 画面操作からデータ保存、画面遷移までの一連のユーザー体験の検証[span_4](start_span)[span_4](end_span)。 |
| **受け入れテスト**<br>*(Acceptance Test)* | シナリオベースの要件検証 (REQ ID 対応)。ユースケース層 / BDD スタイル。 | 統合環境または制御されたテスト環境 | **顧客・ドメインエキスパートが求める要求（REQ ID）を満たしているかの検証**[span_5](start_span)[span_5](end_span)。 |

---

## 3. ブラックボックス設計技法 (Test Design Techniques)

複雑な入力・状態分岐を持つロジック（調合・純度計算・シナリオ分岐等）のテスト設計には以下を適用する[span_6](start_span)[span_6](end_span)：

- **同等性分割 (Equivalence Partitioning)**: 有効・無効の入力クラスを正しく分類し、代表値を選定する。
- **境界値分析 (Boundary Value Analysis)**: 閾値 `N` に対して `N-1`, `N`, `N+1` を厳格に検証する（例: 純度 90.0% の大成功境界判定）[span_7](start_span)[span_7](end_span)。
- **状態遷移テスト (State Transition Testing)**: 定義されたゲーム状態・会話フェーズの遷移条件を網羅する[span_8](start_span)[span_8](end_span)。
- **ペアワイズ法 (Pairwise Testing)**: 多変数の組み合わせ爆発を防ぐため、2因子間の全ペア検証に絞って効率化する。

---

## 4. 単体・統合テスト設計方針（『単体テストの考え方/使い方』準拠）

テストは実装詳細（内部状態やプライベートメソッド）ではなく、**観測可能な振る舞い（Observable Outcome）**を検証する。

### 4.1. ドメイン言語による命名
- `[Method]_[Scenario]_[Expected]` のような構造露呈型の機械的な命名は禁止。
- テスト名は、ドメインエキスパートや開発者が理解できる**自然言語（日本語推奨）のストーリー文**で記述する。
- 受け入れテスト・E2E テスト・ソーシャル単体テストには要求 ID を含める（例: `test("[REQ-CHEM-01] 適正温度で加熱した場合、純度99.9%のアスピリンが生成される")`）[span_9](start_span)[span_9](end_span)。

### 4.2. 単体テストの4柱の最適化
以下の 4 要素のバランスを常に意識する：
1. **退化への保護 (Protection against regressions)**
2. **リファクタリング耐性 (Resistance to refactoring)**: 内部構造の変更でテストが崩れない「偽陽性」のないテストにする。
3. **迅速なフィードバック (Fast feedback)**: ソロ/ソーシャル単体テストはミリ秒単位で実行可能に保つ。
4. **保守性 (Maintainability)**

### 4.3. モック (Mock) の使用基準
- **ソロ単体テスト**: 計算対象以外の依存関係の遮断目的に限定して使用。
- **ソーシャル単体テスト**: ドメインオブジェクト間ではモックを使用せず、実際のインスタンス同士を連携させる。
- **統合/E2E/受け入れテスト**: 外部 I/O 境界（外部APIやメール送信等）のみをモック化し、内部コンポーネントは本物を使用する。

---

## 5. 実務ルール & CI パイプライン

### 実務ルール
- 機能を修正・追加した場合は、対応する要求 ID と受け入れテストの対応関係（トレーサビリティ）を更新する。
- リファクタリング時は**単体テストコードを修正せずに Pass すること（Green-to-Green）**を確認し、リファクタリング耐性を実証する。

### CI 品質ゲート (Quality Gate)
PR 作成時に自動実行されるチェック項目：
1. **静的解析・型チェック**: （例: `mypy`, `tsc`, `eslint` 等）
2. **Fast Tests 実行**: ソロ単体テスト、ソーシャル単体テスト（数秒で完了）
3. **Slow Tests 実行**: 永続化/ゲートウェイ統合テスト、E2E/受け入れテスト
4. **要求カバレッジチェック**: 要求 ID (`REQ-xxx`) が受け入れテストまたは E2E テストに紐付いているかを自動解析し、未カバー要求があればレポートに出力する。
