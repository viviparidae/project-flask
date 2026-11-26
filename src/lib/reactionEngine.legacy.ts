/**
 * reactionEngine.ts
 * エピソード1「古剣の腐食」— 酸洗浄反応エンジン
 *
 * 問題: 古代の名剣が謎の腐食（黒錆＋塩化物錆の複合）に覆われている。
 * 化学的解決: 適切な酸の種類・濃度・温度で腐食を除去しつつ、金属母材を傷めない。
 */

import type { RecipeAttempt } from './recipeEngine'

export type AcidType = 'HCl' | 'Citric' | 'Phosphoric'

export type ReactionInput = {
  acidType: AcidType
  concentration: number  // 1〜5 (1=薄, 5=濃)
  temperature: number    // 15〜60 ℃
  procedure?: 'quick' | 'standard'  // 手順（未指定は standard 扱い）
}

/**
 * UIの選択（RecipeAttempt）を反応条件へ変換する唯一の変換点。
 * プレビュー表示と実行結果で必ず同じ変換を使うこと（過去に二重定義で乖離した）。
 * 対応は仕様書（docs/story/ep01-ancient-sword.md）通り:
 * 濃度 薄め Lv.2 / 標準 Lv.3 / 濃め Lv.5、温度 低温 20℃ / 中温 40℃ / 高温 55℃。
 */
export function reactionInputFromAttempt(attempt: RecipeAttempt): ReactionInput {
  return {
    acidType: attempt.acid,
    concentration:
      attempt.concentration === 'light' ? 2 : attempt.concentration === 'standard' ? 3 : 5,
    temperature:
      attempt.temperature === 'cold' ? 20 : attempt.temperature === 'warm' ? 40 : 55,
    procedure: attempt.procedure,
  }
}

export type ReactionResult = {
  restorationScore: number   // 0〜100
  corrosionRemoved: number   // % (錆除去率)
  metalDamage: number        // % (金属侵食率)
  byproductHazard: boolean   // 有害副産物の発生
}

/**
 * 腐食種別ごとの最適条件 (対話で得た情報に基づく)
 * この剣の腐食: 黒錆(Fe₃O₄) + 塩化物錆(FeCl₂)の複合
 *  → 最適: リン酸(Phosphoric) 濃度3〜4, 温度35〜45℃
 *  → 塩酸は塩化物錆を悪化させる可能性あり
 *  → クエン酸は穏やかだが高濃度・高温でないと不十分
 */
// 最適条件は仕様書（docs/story/ep01-ancient-sword.md「各酸の最適条件」）に合わせる。
// リン酸の濃度レンジは、UI濃度「標準」= Lv.3 が適正係数の中心に来るよう 2〜4 とする
// （仕様書の「Lv.3〜4」は推奨帯の表記。Lv.3 で係数 1.0 になることが勝敗仕様の前提）。
const OPTIMAL: Record<AcidType, { concRange: [number, number]; tempRange: [number, number]; corrosionPower: number }> = {
  HCl:        { concRange: [2, 3], tempRange: [20, 35], corrosionPower: 0.85 },
  Citric:     { concRange: [3, 5], tempRange: [40, 55], corrosionPower: 0.70 },
  Phosphoric: { concRange: [2, 4], tempRange: [35, 45], corrosionPower: 1.00 },
}

function proximity(val: number, min: number, max: number): number {
  const center = (min + max) / 2
  const halfWidth = (max - min) / 2
  const dist = Math.abs(val - center)
  return Math.max(0, 1 - dist / (halfWidth + 1))
}

export function calculateReaction(input: ReactionInput): ReactionResult {
  const opt = OPTIMAL[input.acidType]

  // 錆除去率: 適正濃度・温度に近いほど高い
  // 手順が短時間だと深部の錆まで届かず、除去率は 0.6 倍に落ちる
  const procedureFactor = input.procedure === 'quick' ? 0.6 : 1
  const concProximity = proximity(input.concentration, opt.concRange[0], opt.concRange[1])
  const tempProximity = proximity(input.temperature, opt.tempRange[0], opt.tempRange[1])
  const corrosionRemoved = Math.round(
    opt.corrosionPower * concProximity * tempProximity * procedureFactor * 100 * 10,
  ) / 10

  // 金属侵食率: 濃すぎ・熱すぎで金属母材を攻撃
  const overConc = Math.max(0, input.concentration - opt.concRange[1])
  const overTemp = Math.max(0, input.temperature - opt.tempRange[1])
  // HClは塩化物錆に悪作用し侵食リスクが高い
  const acidPenalty = input.acidType === 'HCl' ? 1.4 : 1.0
  const metalDamage = Math.min(
    100,
    Math.round((overConc * 8 + overTemp * 1.2) * acidPenalty * 10) / 10,
  )

  // 有害副産物: HClで高温・高濃度 → 塩化水素ガス発生
  // 発生条件は仕様書通り「HCl かつ 濃度≥4 かつ 温度≥45℃」
  // （UI の危険条件 塩酸 + 濃め(5) + 高温(55℃) で確実に発生する）
  const byproductHazard =
    input.acidType === 'HCl' && input.concentration >= 4 && input.temperature >= 45

  // 修復スコア = 除去率 − 侵食率
  const restorationScore = Math.max(0, Math.round((corrosionRemoved - metalDamage) * 10) / 10)

  return {
    restorationScore,
    corrosionRemoved,
    metalDamage,
    byproductHazard,
  }
}

