---
name: "Requirements Development"
description: "Rules for writing behavior-focused requirements in Japanese BDD format, quality scenarios, user stories breakdown, and quality characteristics based on Software Requirements 4th Edition."
---

# 要求開発ガイドライン (Requirements Development)

『ソフトウェア要求 第4版』の原則に基づき、本プロジェクトでは**「何を実現するか（What）」と「どのように実装するか（How）」を厳格に分離**する[span_0](start_span)[span_0](end_span)。
機能要求・非機能要求（品質シナリオ）の定義に加え、**要求文書および個々の要求記述が満たすべき品質特性**を遵守する[span_1](start_span)[span_1](end_span)。

---

## 1. BRIEF 原則（要求記述の基本規約）

要求書には、ユーザーにとって意味のある「状態の変更」と「操作の振る舞い」のみを必要最低限かつ簡潔に記載する。

- **観測可能な状態 (Observable State)**:
  - 元素の数・種類、器具の温度、試薬の純度（%）、環境フラグ、キャラクターの状態（会話/信頼度）[span_2](start_span)[span_2](end_span)。
- **観測可能な操作 (Observable Operations)**:
  - 元素の選択・追加、加熱・冷却操作、ろ過/撹拌の実行、試薬の提供、会話の選択肢実行[span_3](start_span)[span_3](end_span)。
- **記載しない内容 (Implementation Leakage)**:
  - px 単位の詳細なレイアウト、色の逐一指定、特定フレームワークの関数名、コンポーネントの細粒度仕様、DBのテーブル構造やSQL[span_4](start_span)[span_4](end_span)。

---

## 2. 要求のブレイクダウンプロセス (Requirements Breakdown Process)

要求は以下の **3 段階の階層構造（Taxonomy）** で上流から順を追ってブレイクダウンし、`requirements.yml` などの構造化データとして管理・追跡する[span_5](start_span)[span_5](end_span)。

1. **ビジョン・スコープ定義書（ビジネス要件 / Business Requirements）**:
   - プロジェクト全体の背景・目的・スコープの境界を定義する[span_6](start_span)[span_6](end_span)。
2. **ユーザーストーリー（ユーザー要件 / User Requirements）**:
   - ユーザー視点でのタスクや達成したいシナリオを以下の標準フォーマットで記述する[span_7](start_span)[span_7](end_span)。
   - **標準フォーマット**: 「<ペルソナ> として、<目的/機能> したい。なぜなら <価値/理由> だからだ。」[span_8](start_span)[span_8](end_span)
3. **受け入れ基準（機能要求 / Functional Requirements - REQ ID）**:
   - ユーザーストーリーを満たすための検証可能なシステム挙動を `REQ ID` ごとに定義する[span_9](start_span)[span_9](end_span)。

---

## 3. BDDにおける「日本語記述」ルール (Japanese BDD Specification)

本プロジェクトにおける BDD（振る舞い駆動開発）および機能要求（`REQ ID`）の記述は、**全件日本語（Japanese）で行うことを義務付ける**。

### 記述言語の標準ルール
1. **日本語自然言語の採用**:
   - 英語の `Given-When-Then` 構造を踏襲しつつ、すべての条件・操作・期待する結果は**明確で簡潔な日本語**で記述する。
   - キーワードは **`【前提】` (Given)** / **`【もし】` (When)** / **`【ならば】` (Then)** の概念を使用する。
2. **ドメイン用語（ユビキタス言語）の統一**:
   - 「調合」「精製」「純度」「適正温度」など、ドメインで定義された用語をそのまま使用し、曖昧な英訳や技術用語への置換を行わない[span_10](start_span)[span_10](end_span)。
3. **英語記述の禁止（Bad Example）**:
   - `Given player has selected C9H8O4 elements When player clicks craft Then purity should be 99.9%` などの英文記述は、要求の解釈ズレを防ぐため要求定義書レベルでは採用しない。

---

## 4. 要求文書に求められる特性 (Characteristics of Requirement Documents)

要求仕様書（`requirements.yml` / `requirements.md` 等の文書全体）は、以下の 5 つの品質特性を満たさなければならない[span_11](start_span)[span_11](end_span)。

1. **完全性 (Complete)**: 必要な機能・制約・品質属性が漏れなく記述され、「TBD」等を放置しない[span_12](start_span)[span_12](end_span)。
2. **一貫性 (Consistent)**: 文書内で定義された要求同士が衝突・矛盾していないこと[span_13](start_span)[span_13](end_span)。
3. **修正可能性 (Modifiable)**: 構造化され、仕様変更時に最小限の変更で更新できること[span_14](start_span)[span_14](end_span)。
4. **追跡可能性 (Traceable)**: 各要求の由来と、対応する日本語受け入れテストへの相互リンクが維持されていること[span_15](start_span)[span_15](end_span)。
5. **有効性 / 実用性 (Effective / Useful)**: 開発者および AI エージェントが正しく設計・実装の判断を下せる情報量であること[span_16](start_span)[span_16](end_span)。

---

## 5. 機能要求の記述形式 (BDD / Given-When-Then)

受け入れ基準（機能要求 / `REQ ID`）は、YAMLまたはBDDテキスト形式でテストコード（Vitest / PyTest）に直接対応づけられる形式で記述する[span_17](start_span)[span_17](end_span)。

### 複数 Given (前提条件) の表現ルール
前提条件が複数存在する場合は、文字列ではなく**配列（リスト）**として列挙・表現する[span_18](start_span)[span_18](end_span)。

### YAML におけるブレイクダウン記述例 (requirements.yml)

```yml
version: "1.0"
project: "Project: FLASK"

# 1. ビジョン・スコープ定義書 (ビジネス要件)
business_requirements:
  id: BR-01
  title: "ボロ小屋からの錬金術精製と対話による運命切り拓き"
  vision: "ボロ小屋から設備を進化させ、純度99.9%の精製技術で来訪者の運命を切り拓く"

# 2. ユーザーストーリー (ユーザー要件)
user_stories:
  - id: US-CHEM-01
    title: "アスピリンの調合"
    actor: "薬剤師（プレイヤー）"
    goal: "患者の症状に合わせて、正しい元素と加熱手順でアスピリンを調合したい"
    reason: "高純度の薬を提供することで患者の症状を回復させ、物語を前進させたいから"
    
    # 3. 受け入れ基準 (機能要求 / REQ ID)
    acceptance_criteria:
      - req_id: REQ-CHEM-01
        priority: "Must"
        title: "適正温度での精製成功"
        # 複数の Given は配列で記述する
        given:
          - "プレイヤーが「アスピリン（C9H8O4）」に必要な元素（C:9, H:8, O:4）を選択している"
          - "精製器具（フラスコ）が正常な状態である"
        when: "加熱温度を 70℃〜80℃ の範囲内に保って「精製」を実行した"
        then: "純度 99.9% のアスピリンが生成され、インベントリに追加される"

      - req_id: REQ-CHEM-02
        priority: "Must"
        title: "不適正温度での精製失敗"
        given:
          - "プレイヤーが「アスピリン（C9H8O4）」に必要な元素を選択している"
        when: "加熱温度を 100℃ 以上に設定して「精製」を実行した"
        then: "純度が 50% 以下に低下し、「不純物・焦げ」が発生する"
```

---

## 6. 個々の要求記述に求められる特性 (Characteristics of Requirement Statements)

各要求項目は、以下の 9 つの品質特性を満たすように日本語で記述する[span_19](start_span)[span_19](end_span)。

| 特性 (Characteristic) | 定義・ルール | 悪い例 (Bad) | 良い例 (Good - 日本語BDD) |
| :--- | :--- | :--- | :--- |
| **1. 正確性 (Accurate)** | ドメイン知識およびビジネス目的に合致している。 | 「適当な温度で精製する」 | 「70℃〜80℃の範囲で加熱し精製する」[span_20](start_span)[span_20](end_span) |
| **2. 妥当性 (Feasible)** | 技術的・コスト的に実現可能である。 | 「AIがリアルタイムで分子を物理シミュレーションする」 | 「定義された結合テーブルに従い純度を計算する」 |
| **3. 必要性 (Necessary)** | ユーザーやシステムにとって本当に価値がある。 | 「ボタン押下で豪華な3D演出が10秒舞う」 | 「精製成功時に純度99.9%を示す青いエフェクトを表示する」 |
| **4. 優先順位付け (Prioritized)** | 重要度（Must / Should / Could）が明確。 | （すべての要求が同等） | `[Must]` `REQ-CHEM-01` |
| **5. 明確性 (Unambiguous)** | 読者によって解釈が分かれない単一の意味を持つ。 | 「操作を素早く行うと大成功になる」 | 「加熱から3秒以内に精製ボタンを押すと大成功になる」 |
| **6. 検証可能性 (Verifiable)** | テストで Pass/Fail を一義的に判断できる。 | 「画面を使いやすくする」 | 「日本語 BDD (Given-When-Then) 形式で記述されている」[span_21](start_span)[span_21](end_span) |
| **7. 簡潔性 (Concise)** | 余計な修飾語を排し、1つの文に1つの主張。 | 「加熱と冷却とろ過を同時に行いログも吐く」 | 1つの要求につき1つの操作と結果に分解して記述[span_22](start_span)[span_22](end_span) |
| **8. 抽象度の一貫性 (Implementation-Free)** | 実装詳細（クラス名、HTMLタグ、CSS等）に非依存。 | 「`<div>`内の PurityState を更新する」 | 「観測可能な純度状態を更新する」[span_23](start_span)[span_23](end_span) |
| **9. 追跡可能性 (Traceable)** | 固有の識別子（REQ ID）を持つ。 | 「解熱剤の調合ロジック」 | `REQ-CHEM-01` |

---

## 7. 非機能要求の記述形式：品質シナリオ (Quality Scenarios)

非機能要求は、測定不能な形容詞を排除し、**6 つの構成要素（源・刺激・環境・対象・応答・応答尺度）** を含む品質シナリオとして日本語で定量記述する[span_24](start_span)[span_24](end_span)。

### 品質シナリオの記述例
- **要求 ID**: `NFR-PERF-01` `[Must]`
- **源**: ユーザー
- **刺激**: 「精製」ボタンを押下する
- **環境**: 通常ゲームプレイ時
- **対象**: `PurityCalculator`（純度計算エンジン）
- **応答**: 入力条件に応じた純度結果（%）を算出する
- **応答尺度**: **UI描画完了まで100ms以内**にレスポンスし、同一の入力に対して**100%同一の計算結果（誤差0%）**を返すこと
