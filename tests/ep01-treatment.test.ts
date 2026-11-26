import { describe, expect, it } from 'vitest'
import { judgeRestoration } from '../src/lib/fateEngine'
import { RECIPE_EP01, type Recipe, type RecipeAttempt, createEmptyAttempt, executeStep, evaluateRecipe } from '../src/lib/recipeEngine'
import { executeTreatment, type TreatmentResult } from '../src/lib/treatmentEngine'

/**
 * [EP01 勝敗検証 / phaser-rewrite] 新レシピ式エンジンの勝敗到達可能性を検証する。
 *
 * 新設計:
 * - レシピの手順を順に実行する
 * - 正しい手順で作れば成功（品質段階: perfect/good/partial/failed）
 * - 手順ミスは品質段階と依頼人の反応の小分岐にだけ効かせる
 * - Ep.1 の推奨処置（リン酸／標準濃度／中温）はレシピの記載内容として残す
 */

// 正解の手順パラメータ（レシピ記載通り）
const CORRECT_STEP_PARAMS: Array<Record<string, string>> = [
    { reagent: 'Phosphoric', concentration: 'standard' },
    { reagent: 'water', concentration: 'adjusted' },
    { temperature: 'warm' },
    { duration: 'standard' },
    { filtration: 'standard' },
  ]

// 全手順を正解で実行した試行状態
function createPerfectAttempt(): RecipeAttempt {
  let attempt = createEmptyAttempt()
  for (const params of CORRECT_STEP_PARAMS) {
    attempt = executeStep(RECIPE_EP01, attempt, params)
  }
  return attempt
}

// 1手順ミスした試行状態
function createOneMistakeAttempt(): RecipeAttempt {
  let attempt = createEmptyAttempt()
  // 最初の手順だけミス（塩酸を選ぶ）
  attempt = executeStep(RECIPE_EP01, attempt, { reagent: 'HCl', concentration: 'strong' })
  // 残りは正解
  for (let i = 1; i < CORRECT_STEP_PARAMS.length; i++) {
    attempt = executeStep(RECIPE_EP01, attempt, CORRECT_STEP_PARAMS[i])
  }
  return attempt
}

// 2手順ミスした試行状態
function createTwoMistakesAttempt(): RecipeAttempt {
  let attempt = createEmptyAttempt()
  attempt = executeStep(RECIPE_EP01, attempt, { reagent: 'HCl', concentration: 'strong' })
  attempt = executeStep(RECIPE_EP01, attempt, { reagent: 'water', concentration: 'wrong' })
  for (let i = 2; i < CORRECT_STEP_PARAMS.length; i++) {
    attempt = executeStep(RECIPE_EP01, attempt, CORRECT_STEP_PARAMS[i])
  }
  return attempt
}

// 3手順以上ミスした試行状態
function createManyMistakesAttempt(): RecipeAttempt {
  let attempt = createEmptyAttempt()
  for (let i = 0; i < 3; i++) {
    attempt = executeStep(RECIPE_EP01, attempt, { reagent: 'wrong', concentration: 'wrong' })
  }
  for (let i = 3; i < CORRECT_STEP_PARAMS.length; i++) {
    attempt = executeStep(RECIPE_EP01, attempt, CORRECT_STEP_PARAMS[i])
  }
  return attempt
}

describe('[EP01/phaser] レシピエンジン — 手順実行・評価', () => {
  it('レシピは5つの手順を持つ', () => {
    expect(RECIPE_EP01.steps).toHaveLength(5)
    expect(RECIPE_EP01.steps[0].label).toBe('リン酸を標準濃度で準備する')
    expect(RECIPE_EP01.steps[0].reason).toContain('塩化物錆に有効')
  })

  it('手順には「なぜこの手順か」の理由が1行ずつある', () => {
    for (const step of RECIPE_EP01.steps) {
      expect(step.reason).toBeTruthy()
      expect(step.reason.length).toBeGreaterThan(10)
    }
  })

  it('材料リストが正しく定義されている', () => {
    expect(RECIPE_EP01.ingredients).toContain('リン酸 (H₃PO₄) — 標準濃度')
    expect(RECIPE_EP01.ingredients).toContain('蒸留水 — 希釈用')
    expect(RECIPE_EP01.ingredients).toContain('古剣（対象）')
  })
})

describe('[EP01/phaser] 品質評価 — executeStep + evaluateRecipe', () => {
  it('全手順正解で perfect 品質になる', () => {
    const attempt = createPerfectAttempt()
    const result = evaluateRecipe(RECIPE_EP01, attempt)

    expect(result.isComplete).toBe(true)
    expect(result.qualityTier).toBe('perfect')
    expect(result.progress.completed).toBe(5)
    expect(result.progress.total).toBe(5)
    expect(result.mistakes).toHaveLength(0)
  })

  it('1手順ミスで good 品質になる', () => {
    const attempt = createOneMistakeAttempt()
    const result = evaluateRecipe(RECIPE_EP01, attempt)

    expect(result.isComplete).toBe(true)
    expect(result.qualityTier).toBe('good')
    expect(result.mistakes).toHaveLength(1)
    expect(result.mistakes[0].stepId).toBe(0)
  })

  it('2手順ミスで partial 品質になる', () => {
    const attempt = createTwoMistakesAttempt()
    const result = evaluateRecipe(RECIPE_EP01, attempt)

    expect(result.isComplete).toBe(true)
    expect(result.qualityTier).toBe('partial')
    expect(result.mistakes).toHaveLength(2)
  })

  it('3手順以上ミスで failed 品質になる', () => {
    const attempt = createManyMistakesAttempt()
    const result = evaluateRecipe(RECIPE_EP01, attempt)

    expect(result.isComplete).toBe(true)
    expect(result.qualityTier).toBe('failed')
    expect(result.mistakes.length).toBeGreaterThanOrEqual(3)
  })

  it('未完了状態では isComplete が false', () => {
    let attempt = createEmptyAttempt()
    attempt = executeStep(RECIPE_EP01, attempt, CORRECT_STEP_PARAMS[0])
    const result = evaluateRecipe(RECIPE_EP01, attempt)

    expect(result.isComplete).toBe(false)
    expect(result.progress.completed).toBe(1)
  })
})

describe('[EP01/phaser] 統合実行 — executeTreatment', () => {
  it('完全修復（perfect）で PERFECT 判定になる', () => {
    const attempt = createPerfectAttempt()
    const { recipeResult, fate } = executeTreatment(attempt)

    expect(recipeResult.qualityTier).toBe('perfect')
    expect(fate.grade).toBe('PERFECT')
    expect(fate.resultTitle).toContain('完全修復')
    expect(fate.trustDelta).toBe(35)
    expect(fate.reward).toBe(280)
  })

  it('1手順ミス（good）で GOOD 判定になる', () => {
    const attempt = createOneMistakeAttempt()
    const { recipeResult, fate } = executeTreatment(attempt)

    expect(recipeResult.qualityTier).toBe('good')
    expect(fate.grade).toBe('GOOD')
    expect(fate.resultTitle).toContain('良好')
    expect(fate.trustDelta).toBe(18)
    expect(fate.reward).toBe(160)
  })

  it('2手順ミス（partial）で PARTIAL 判定になる', () => {
    const attempt = createTwoMistakesAttempt()
    const { recipeResult, fate } = executeTreatment(attempt)

    expect(recipeResult.qualityTier).toBe('partial')
    expect(fate.grade).toBe('PARTIAL')
    expect(fate.resultTitle).toContain('不完全')
    expect(fate.trustDelta).toBe(3)
    expect(fate.reward).toBe(60)
  })

  it('多数ミス（failed）で DAMAGED 判定になる', () => {
    const attempt = createManyMistakesAttempt()
    const { recipeResult, fate } = executeTreatment(attempt)

    expect(recipeResult.qualityTier).toBe('failed')
    expect(fate.grade).toBe('DAMAGED')
    expect(fate.trustDelta).toBe(-30)
    expect(fate.reward).toBe(0)
  })

  it('同じ入力では常に同じ結果になる（決定論性）', () => {
    const attempt = createPerfectAttempt()
    expect(executeTreatment(attempt)).toEqual(executeTreatment(attempt))
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

describe('[EP01/phaser] 品質段階の全到達可能性', () => {
  it('perfect / good / partial / failed の全品質段階に到達できる', () => {
    const tiers = new Set<string>()
    tiers.add(evaluateRecipe(RECIPE_EP01, createPerfectAttempt()).qualityTier)
    tiers.add(evaluateRecipe(RECIPE_EP01, createOneMistakeAttempt()).qualityTier)
    tiers.add(evaluateRecipe(RECIPE_EP01, createTwoMistakesAttempt()).qualityTier)
    tiers.add(evaluateRecipe(RECIPE_EP01, createManyMistakesAttempt()).qualityTier)

    expect(tiers).toEqual(new Set(['perfect', 'good', 'partial', 'failed']))
  })

  it('全グレード（PERFECT/GOOD/PARTIAL/DAMAGED）に到達できる', () => {
    const grades = new Set<string>()
    grades.add(executeTreatment(createPerfectAttempt()).fate.grade)
    grades.add(executeTreatment(createOneMistakeAttempt()).fate.grade)
    grades.add(executeTreatment(createTwoMistakesAttempt()).fate.grade)
    grades.add(executeTreatment(createManyMistakesAttempt()).fate.grade)

    expect(grades).toEqual(new Set(['PERFECT', 'GOOD', 'PARTIAL', 'DAMAGED']))
  })
})