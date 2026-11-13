# [ADR-0004] Phaser ゲームエンジンへの移行

* **ステータス**: Proposed
* **決定者**: Project: FLASK 開発チーム
* **日付**: 2026-11-11
* **関連要求**: `REQ-CHEM-*`, `REQ-FATE-*`, `REQ-TALK-*`, `NFR-PERF-01`, `NFR-REPR-01`, `NFR-GRAPH-01`

---

## 1. 文脈と問題提起 (Context & Problem Statement)

現在の実装は **React + Vite + TypeScript** のスタンドアロンフロントエンド（ADR-0003）として構築されている。しかし、ゲーム的表現（アニメーション、パーティクル、シーン遷移、アセット管理、入力処理）において React の DOM 操作モデルでは限界があり、以下の課題がある：

1. **ゲームループ不在**: React はレンダリングループを持たず、フレーム単位の更新（60fps 固定ステップ）が困難
2. **アセット管理**: 画像・音声・スプライトシート・タイルマップの統合管理が React エコシステムでは弱い
3. **シーン管理**: フェーズ遷移（対話→ラボ→結果）をステートマシンとして明示的に制御しにくい
4. **入力処理**: キーボード・ゲームパッド・タッチの統合入力レイヤーが標準でない
5. **物理/パーティクル**: 将来的な表現拡張（エフェクト、物理演算）への対応が React 単体では困難

---

## 2. 検討した選択肢 (Considered Options)

* **選択肢 A: React + カスタムゲームループ（現状維持・拡張）**
  - `requestAnimationFrame` で自前ループを実装し、React state と同期
  - *メリット*: 既存コード資産を最大限活用、Web 技術スタックの知見を流用
  - *デメリット*: アセット管理・シーン遷移・入力・物理をすべて自前実装必要。React の再レンダリングコストがボトルネックになりやすい

* **選択肢 B: Phaser 3 への完全移行**
  - Phaser 3（TypeScript ネイティブ、Vite 対応済み）をゲームエンジンとして採用
  - 純粋ロジック（`src/lib/*.ts`）は **そのまま import 継続**（依存ゼロ・副作用なし）
  - UI レイヤーのみ Phaser Scene / DOM オーバーレイ / rexUI に置き換え
  - *メリット*: ゲームループ・アセット・シーン・入力・物理・パーティクルが標準装備。TypeScript ファースト。Vite と相性良好
  - *デメリット*: UI 実装の書き換えコスト。React コンポーネント資産は流用不可（DOM オーバーレイ併用で一部緩和可能）

* **選択肢 C: Godot / Unity 等ネイティブエンジンへの移行**
  - *メリット*: 高性能、エディタ完備
  - *デメリット*: Web 配布の制約（WASM サイズ、ロード時間）、TypeScript 資産（純粋ロジック）の移植コスト大、CI/CD 複雑化

---

## 3. 決定と根拠 (Decision Outcome & Rationale)

**選択肢 B（Phaser 3 への移行）を採用する。**

### 主たる理由

1. **アーキテクチャの核（純粋ロジック）は不変**
   - `src/lib/dialogueEngine.ts`, `recipeEngine.ts`, `reactionEngine.ts`, `fateEngine.ts`, `purityEngine.ts` は **副作用なし・React 非依存・DOM 非依存** の純粋 TypeScript 関数群であり、Phaser 側から `import` するだけでそのまま動作する
   - ADR-0002（決定論的純度エンジン）の要件を完全に維持可能

2. **Web ファーストのスタンドアロン性を維持**
   - Phaser + Vite で単一 HTML/JS バンドルとしてビルド可能。外部 API・サーバー不要の要件（ADR-0003）を継承

3. **ゲーム固有機能の実装コストを大幅削減**
   - シーン遷移（`scene.start('Lab', data)`）、アセットローダー、入力管理、Tween/アニメーション、パーティクル、カメラ制御が標準 API で完結

4. **TypeScript ネイティブ・Vite 互換**
   - Phaser 3.80+ は型定義同梱。`vite.config.ts` ほぼ変更なしで統合可能

---

## 4. 移行戦略

### 4.1 保持する資産（変更なし）
```
src/lib/
├── dialogueEngine.ts   # 対話ノード・状態遷移（純粋関数）
├── recipeEngine.ts     # レシピ照合・パラメータ定義
├── reactionEngine.ts   # 酸洗浄反応計算
├── fateEngine.ts       # 因果判定・分岐ロジック
└── purityEngine.ts     # 純度計算・設備制約（コア）
```

### 4.2 置き換える資産
```
src/
├── App.tsx          →  Game.ts + Scene 群（Boot/Preload/Dialogue/Lab/Result/HUD）
├── main.tsx         →  main.ts（Phaser ブート）
├── styles.css       →  部分流用（HUD 用 CSS）または Phaser UI テーマへ
└── index.html       →  エントリーポイント変更（`<div id="game">`）
```

### 4.3 シーン構成
```
BootScene    → 設定読み込み・スケール設定
PreloadScene → アセット読み込み（プレースホルダで開始）
DialogueScene → 対話フェーズ（dialogueEngine.ts 流用）
LabScene     → 処置ラボ（recipeEngine/reactionEngine 流用、UI は DOM オーバーレイ推奨）
ResultScene  → 結果表示（fateEngine 流用）
HUDScene     → 常駐ヘッダー（評判/所持金）、scene.run('HUD') で並行実行
```

### 4.4 UI 実装方針：LabScene は **DOM オーバーレイ** 推奨
- 既存のセレクタグリッド（React コンポーネント）をほぼそのまま流用可能
- Phaser Canvas 上に `<div id="ui-overlay">` を重ね、React 18 `createRoot` でマウント
- Phaser ↔ React 間は `window.dispatchEvent(new CustomEvent(...))` または共有ステートで連携
- 将来的に Phaser 純粋 UI（rexUI / 自作）へ置き換え可能

---

## 5. 評価と結果 (Consequences)

### 正の影響
* ゲームループ・シーン管理・アセット・入力・Tween/パーティクルが標準解決
* 純粋ロジック層の決定論的テスト（Vitest）は **そのまま継続・強化**
* 将来的なエフェクト・物理・タイルマップ拡張への足掛かり
* Vite + TypeScript 環境の知見を完全流用

### 負の影響 / リスク
* UI 実装の書き換え工数（LabScene が最大）
* React コンポーネントテスト（Testing Library）から Phaser Scene テストへの移行必要
* DOM オーバーレイ併用時のレイヤー順・入力フォーカス管理に注意

---

## 6. 適合度関数 / 検証基準 (Fitness Functions & Validation)

1. **純粋ロジックテスト継続**: `npm test` 既存テストが全 Pass（`src/lib/` 変更なしで保証）
2. **Phaser ブートテスト**: `npm run dev` で Phaser.Game インスタンスが起動し、最初のシーン表示まで到達
3. **シーン遷移テスト**: DialogueScene → LabScene → ResultScene → DialogueScene のループが手動/自動で動作
4. **決定論性検証**: 同一入力パラメータで `reactionEngine.ts` / `fateEngine.ts` が同一結果を返すこと（既存テストでカバー）
5. **ビルド検証**: `npm run build` で単一 `index.html` + アセットバンドルが生成され、静的ホスティングで動作
6. **Lint/TypeCheck**: `npm run lint` / `tsc -b` エラー 0 件

---

## 7. 関連ドキュメント更新予定

- `vision-and-scope.md`: 技術スタックを Phaser に更新
- `architecture.md`: C4 コンテナ/コンポーネント図を Phaser 版に更新
- `frontend-architecture.md` → `game-architecture.md` に改名・内容刷新
- `requirements.md`: UC-01〜05 の実装対象を Phaser Scene にマッピング追記