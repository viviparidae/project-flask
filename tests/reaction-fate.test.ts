import { describe, expect, it } from 'vitest'
import { judgeRestoration } from '../src/lib/fateEngine'
import {
  calculateReaction,
  reactionInputFromAttempt,
} from '../src/lib/reactionEngine'
import type { RecipeAttempt } from '../src/lib/recipeEngine'

/**
 * [EP01 勝敗検証] エピソード1「古剣の腐食」の勝敗到達可能性を検証する。
 *
 * 仕様の出典:
 * - レシピ定義 (recipeEngine.ts RECIPE_EP01): リン酸洗浄液（温度 35〜45℃）、
 *   正解は リン酸 / 標準 / 中温 / 標準手順、危険な組み合わせは 塩酸 + 濃め + 高温
 * - reactionEngine.ts のコメント: リン酸の最適条件は濃度3〜4, 温度35〜45℃
 * - fateEngine.ts の閾値: PERFECT ≧ 80, GOOD ≧ 55, PARTIAL ≧ 25
 */

const CORRECT: RecipeAttempt = {
  acid: 'Phosphoric',
  concentration: 'standard',
  temperature: 'warm',
  procedure: 'standard',
}

function execute(attempt: RecipeAttempt) {
  const reaction = calculateReaction(reactionInputFromAttempt(attempt))
  const fate = judgeRestoration(reaction.restorationScore, reaction.byproductHazard)
  return { reaction, fate }
}

describe('[EP01] reactionInputFromAttempt — UI選択から反応条件への変換', () => {
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

describe('[EP01] 勝敗判定 — 正解の処置で勝利できる', () => {
  it('会話のヒント通りの処置で PERFECT（完全修復）に到達する', () => {
    const { reaction, fate } = execute(CORRECT)
    expect(reaction.corrosionRemoved).toBeGreaterThanOrEqual(80)
    expect(reaction.metalDamage).toBe(0)
    expect(fate.grade).toBe('PERFECT')
    expect(fate.resultTitle).toContain('完全修復')
    expect(fate.trustDelta).toBe(35)
    expect(fate.reward).toBe(280)
  })

  it('同じ入力では常に同じ結果になる（決定論性 NFR-REPR-01）', () => {
    expect(execute(CORRECT)).toEqual(execute(CORRECT))
  })

  it('正解の処置でも手順を手抜き（短時間）すると PERFECT には届かず GOOD に落ちる', () => {
    const { fate } = execute({ ...CORRECT, procedure: 'quick' })
    expect(fate.grade).toBe('GOOD')
  })
})

describe('[EP01] 勝敗判定 — 事故と敗北に到達できる', () => {
  it('塩酸 + 濃め + 高温で塩化水素ガス事故が発生する', () => {
    const { reaction, fate } = execute({
      acid: 'HCl',
      concentration: 'strong',
      temperature: 'hot',
      procedure: 'standard',
    })
    expect(reaction.byproductHazard).toBe(true)
    expect(fate.grade).toBe('DAMAGED')
    expect(fate.resultTitle).toContain('塩化水素ガス')
    expect(fate.trustDelta).toBe(-40)
    expect(fate.reward).toBe(0)
  })

  it('リン酸でも濃度が薄いと除去が届かず PARTIAL（修復不完全）止まり', () => {
    const { reaction, fate } = execute({
      acid: 'Phosphoric',
      concentration: 'light',
      temperature: 'warm',
      procedure: 'standard',
    })
    expect(reaction.byproductHazard).toBe(false)
    expect(reaction.restorationScore).toBe(50)
    expect(fate.grade).toBe('PARTIAL')
  })

  it('クエン酸は金属を傷めないが、高温・濃めでも効果が薄く敗北する（効果不足）', () => {
    const { reaction, fate } = execute({
      acid: 'Citric',
      concentration: 'strong',
      temperature: 'hot',
      procedure: 'standard',
    })
    expect(reaction.metalDamage).toBe(0)
    expect(reaction.restorationScore).toBeLessThan(25)
    expect(fate.grade).toBe('DAMAGED')
  })
})

describe('[EP01] 全組み合わせの到達可能性', () => {
  const acids = ['HCl', 'Citric', 'Phosphoric'] as const
  const concs = ['light', 'standard', 'strong'] as const
  const temps = ['cold', 'warm', 'hot'] as const
  const procs = ['quick', 'standard'] as const

  it('PERFECT に到達できるのは正解の組み合わせだけ', () => {
    const perfects: RecipeAttempt[] = []
    for (const acid of acids)
      for (const concentration of concs)
        for (const temperature of temps)
          for (const procedure of procs) {
            const attempt = { acid, concentration, temperature, procedure }
            if (execute(attempt).fate.grade === 'PERFECT') perfects.push(attempt)
          }
    expect(perfects).toEqual([CORRECT])
  })

  it('PERFECT / GOOD / PARTIAL / DAMAGED の全グレードに到達できる', () => {
    const grades = new Set<string>()
    for (const acid of acids)
      for (const concentration of concs)
        for (const temperature of temps)
          for (const procedure of procs) {
            grades.add(execute({ acid, concentration, temperature, procedure }).fate.grade)
          }
    expect(grades).toEqual(new Set(['PERFECT', 'GOOD', 'PARTIAL', 'DAMAGED']))
  })
})
