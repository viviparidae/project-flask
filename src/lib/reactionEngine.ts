/**
 * reactionEngine.ts
 * エピソード1「古剣の腐食」— 酸洗浄反応エンジン
 *
 * 問題: 古代の名剣が謎の腐食（黒錆＋塩化物錆の複合）に覆われている。
 * 化学的解決: 適切な酸の種類・濃度・温度で腐食を除去しつつ、金属母材を傷めない。
 */

export type AcidType = 'HCl' | 'Citric' | 'Phosphoric'

export type ReactionInput = {
  acidType: AcidType
  concentration: number  // 1〜5 (1=薄, 5=濃)
  temperature: number    // 15〜60 ℃
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
const OPTIMAL: Record<AcidType, { concRange: [number, number]; tempRange: [number, number]; corrosionPower: number }> = {
  HCl:        { concRange: [2, 3], tempRange: [15, 40], corrosionPower: 0.85 },
  Citric:     { concRange: [3, 5], tempRange: [50, 70], corrosionPower: 0.70 },
  Phosphoric: { concRange: [3, 4], tempRange: [65, 85], corrosionPower: 1.00 },
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
  const concProximity = proximity(input.concentration, opt.concRange[0], opt.concRange[1])
  const tempProximity = proximity(input.temperature, opt.tempRange[0], opt.tempRange[1])
  const corrosionRemoved = Math.round(
    opt.corrosionPower * concProximity * tempProximity * 100 * 10,
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
  const byproductHazard =
    input.acidType === 'HCl' && input.concentration >= 4 && input.temperature >= 85

  // 修復スコア = 除去率 − 侵食率
  const restorationScore = Math.max(0, Math.round((corrosionRemoved - metalDamage) * 10) / 10)

  return {
    restorationScore,
    corrosionRemoved,
    metalDamage,
    byproductHazard,
  }
}

