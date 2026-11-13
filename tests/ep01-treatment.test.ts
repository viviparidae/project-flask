import { describe, expect, it } from 'vitest'
import { judgeRestoration } from '../src/lib/fateEngine'
import { reactionInputFromAttempt } from '../src/lib/reactionEngine'
import type { RecipeAttempt } from '../src/lib/recipeEngine'
import { createEmptyAttempt, executeTreatment } from '../src/lib/treatmentEngine'

/**
 * [EP01 勝敗検証 / phaser-rewrite] Phaser 版の実行パイプライン
 * （treatmentEngine.executeTreatment）の勝敗到達可能性を検証する。
 *
 * 仕様の出典: docs/story/ep01-ancient-sword.md
 * - リン酸 最適: 濃度 Lv.3〜4 / 温度 35〜45℃、除去力 1.00（推奨）
 * - 有害ガス発生: HCl かつ 濃度≥4 かつ 温度≥45℃
 * - 結末: スコア≥80 PERFECT(+35/280G)、55〜79 GOOD(+18/160G)、
 *   25〜54 PARTIAL(+3/60G)、<25 DAMAGED(-30/0G)、ガス事故 DAMAGED(-40/0G)
 * - UI の対応（実行時）: 温度 低温 20℃ / 中温 40℃ / 高温 55℃、
 *   濃度 薄め Lv.2 / 標準 Lv.3 / 濃め Lv.5
 */

const CORRECT: RecipeAttempt = {
  ...createEmptyAttempt(),
  acid: 'Phosphoric',
  concentration: 'standard',
  temperature: 'warm',
  procedure: 'standard',
  reaction: 'standard',
  filtration: 'standard',
}

describe('[EP01/phaser] reactionInputFromAttempt — UI選択から反応条件への変換', () => {
  it('正解の組み合わせはリン酸の最適条件（濃度3〜4, 温度35〜45℃）に一致する', () => {
    const input = reactionInputFromAttempt(CORRECT)
    expect(input.acidType).toBe('Phosphoric')
    expect(input.concentration).toBeGreaterThanOrEqual(3)
    expect(input.concentration).toBeLessThanOrEqual(4)
    expect(input.temperature).toBeGreaterThanOrEqual(35)
    expect(input.temperature).toBeLessThanOrEqual(45)
    expect(input.procedure).toBe('standard')
  })
})

describe('[EP01/phaser] 勝敗判定 — executeTreatment', () => {
  it('会話のヒント通りの処方で完全修復（PERFECT）に到達する', () => {
    const { recipeResult, reactionResult, fate } = executeTreatment(CORRECT)
    expect(recipeResult.matchScore).toBe(6)
    expect(recipeResult.grade).toBe('PERFECT')
    expect(reactionResult.corrosionRemoved).toBe(100)
    expect(reactionResult.metalDamage).toBe(0)
    expect(reactionResult.restorationScore).toBe(100)
    expect(fate.grade).toBe('PERFECT')
    expect(fate.resultTitle).toContain('完全修復')
    expect(fate.trustDelta).toBe(35)
    expect(fate.reward).toBe(280)
  })

  it('同じ入力では常に同じ結果になる（決定論性 NFR-REPR-01）', () => {
    expect(executeTreatment(CORRECT)).toEqual(executeTreatment(CORRECT))
  })

  it('手順だけ短時間にすると深部に届かず GOOD（スコア60）に落ちる', () => {
    const { reactionResult, fate } = executeTreatment({ ...CORRECT, procedure: 'quick' })
    expect(reactionResult.restorationScore).toBe(60)
    expect(fate.grade).toBe('GOOD')
  })

  it('塩酸 + 濃め + 高温で塩化水素ガス事故が発生する', () => {
    const { recipeResult, reactionResult, fate } = executeTreatment({
      ...CORRECT,
      acid: 'HCl',
      concentration: 'strong',
      temperature: 'hot',
    })
    expect(recipeResult.isAccident).toBe(true)
    expect(reactionResult.byproductHazard).toBe(true)
    expect(fate.grade).toBe('DAMAGED')
    expect(fate.resultTitle).toContain('塩化水素ガス')
    expect(fate.trustDelta).toBe(-40)
    expect(fate.reward).toBe(0)
  })

  it('リン酸でも濃度が薄いと PARTIAL（修復不完全）止まり', () => {
    const { reactionResult, fate } = executeTreatment({ ...CORRECT, concentration: 'light' })
    expect(reactionResult.restorationScore).toBe(50)
    expect(fate.grade).toBe('PARTIAL')
  })
})

describe('[EP01/phaser] fateEngine の結末表（仕様書通り）', () => {
  it.each([
    [100, 'PERFECT', 35, 280],
    [80, 'PERFECT', 35, 280],
    [79, 'GOOD', 18, 160],
    [55, 'GOOD', 18, 160],
    [54, 'PARTIAL', 3, 60],
    [25, 'PARTIAL', 3, 60],
    [24, 'DAMAGED', -30, 0],
    [0, 'DAMAGED', -30, 0],
  ] as const)('スコア %i は %s（評判 %+i / 報酬 %iG）', (score, grade, trustDelta, reward) => {
    const outcome = judgeRestoration(score, false)
    expect(outcome.grade).toBe(grade)
    expect(outcome.trustDelta).toBe(trustDelta)
    expect(outcome.reward).toBe(reward)
  })

  it('有害副産物があればスコアに関係なくガス事故（評判 -40 / 報酬 0G）', () => {
    const outcome = judgeRestoration(100, true)
    expect(outcome.grade).toBe('DAMAGED')
    expect(outcome.resultTitle).toContain('事故発生')
    expect(outcome.trustDelta).toBe(-40)
    expect(outcome.reward).toBe(0)
  })
})

describe('[EP01/phaser] 全組み合わせの到達可能性', () => {
  const acids = ['HCl', 'Citric', 'Phosphoric'] as const
  const concs = ['light', 'standard', 'strong'] as const
  const temps = ['cold', 'warm', 'hot'] as const
  const procs = ['quick', 'standard'] as const

  it('PERFECT に到達できるのは正解の処方（手順含む）だけ', () => {
    const perfects: RecipeAttempt[] = []
    for (const acid of acids)
      for (const concentration of concs)
        for (const temperature of temps)
          for (const procedure of procs) {
            const attempt = { ...CORRECT, acid, concentration, temperature, procedure }
            if (executeTreatment(attempt).fate.grade === 'PERFECT') perfects.push(attempt)
          }
    expect(perfects).toEqual([CORRECT])
  })

  it('PERFECT / GOOD / PARTIAL / DAMAGED の全グレードに到達できる', () => {
    const grades = new Set<string>()
    for (const acid of acids)
      for (const concentration of concs)
        for (const temperature of temps)
          for (const procedure of procs) {
            grades.add(
              executeTreatment({ ...CORRECT, acid, concentration, temperature, procedure }).fate
                .grade,
            )
          }
    expect(grades).toEqual(new Set(['PERFECT', 'GOOD', 'PARTIAL', 'DAMAGED']))
  })
})
