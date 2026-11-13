# Project: FLASK — ビジョン・スコープ定義書 (Vision and Scope Document)

- **文書バージョン**: 1.1.0
- **策定日**: 2026-10-06
- **ステータス**: Approved
- **対象**: Phaser 3 + Vite + TypeScript スタンドアロンフロントエンド（Web ゲーム）
- **準拠規格**: 『ソフトウェア要求 第4版』 / ISO/IEC 29148

## 1. ビジネス要求

Project: FLASK は、異世界薬局、ブレイキング・バッド、VA-11 Hall-A の要素を生かした会話×化学合成アドベンチャーゲームである。プレイヤーは、患者との対話、原子の生成、反応条件の制御、純度による因果判定を、フロントエンドだけで行う。

## 2. スコープ

### 2.1 対象

- Phaser 3 / Vite / TypeScript によるスタンドアロン Web ゲーム
- 対話診断と推奨ターゲットの表示（DialogueScene）
- 設備Tier、温度、触媒滴数による純度計算（純粋関数として継続）
- 反応結果の決定論的な表示（LabScene / ResultScene）
- アセット管理・シーン遷移・入力処理・Tween/パーティクル（Phaser 標準機能）
- 静的資産としての実行（単一 HTML/JS バンドル）

### 2.2 対象外

- Python / Flask バックエンド
- 外部API、DB、認証、データ永続化
- ネイティブアプリ（Godot/Unity 等）への移植は将来検討
- マルチプレイヤー

## 3. 技術制約

- TypeScript 5.7 以上、Phaser 3.80+、Vite 6
- Node.js 20 以上
- npm package manager
- Vitest、Testing Library、jsdom（純粋ロジックテスト用）
- 外部サービスを使用しない
- フロントエンドのビルドとテストだけで起動可能
- **純粋ロジック（`src/lib/*.ts`）は React/Phaser 非依存のまま維持**

## 4. 要求の追跡

- REQ-CHEM-01〜04: 純度計算
- REQ-TALK-01: 対話診断
- NFR-PERF-01: 応答性能
- NFR-REPR-01: 決定論性

## 5. 次のステップ

1. Phaser 3 導入（`npm install phaser`）とブート雛形作成
2. 既存純粋ロジック（`src/lib/*.ts`）の import 検証
3. シーン基盤実装（Boot → Preload → Dialogue → Lab → Result + HUD）
4. LabScene UI 実装（DOM オーバーレイで React セレクタ流用、または Phaser UI）
5. 既存受け入れテスト（純粋ロジック）の継続実行確認
6. Vite 本番ビルド・ESLint 実行
