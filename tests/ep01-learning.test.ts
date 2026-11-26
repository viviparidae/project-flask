import { describe, expect, it } from 'vitest'
import { EP01_NOTES, formatNoteTitle, getNote } from '../src/lib/knowledge'
import {
  applyUnlockConstraints,
  buildAnalysisMemo,
  categorizeOutcome,
  evaluatePrediction,
  executePractice,
  isParamUnlocked,
  toLearnedSet,
  visibleHints,
} from '../src/lib/learning'
import { RECIPE_EP01, createEmptyAttempt, executeStep, evaluateRecipe } from '../src/lib/recipeEngine'
import { REQUEST_CARD, executeTreatment } from '../src/lib/treatmentEngine'
import type { RecipeAttempt } from '../src/lib/recipeEngine'

/**
 * [EP01 学習ループ検証 / 試作]
 * 設計: docs/design/learning-progression.md
 * 観察 → 予想 → 実験（練習処置）→ 解説 → ノート獲得 の1周を検証する。
 *
 * Phase 1 注意: 新レシピ式APIに合わせてテストを更新。
 * 旧パラメータ選択型の CORRECT は使用せず、手順実行型の試行状態を使用。
 */

/** 観察パートで得られる初期ノート（試作ではラボ入室時に付与） */
const OBSERVED = toLearnedSet(['rust', 'chloride-rust', 'acid-strength'])
const NONE = toLearnedSet([])

// 全手順正解で実行した試行状態
function createPerfectAttempt(): RecipeAttempt {
  let attempt = createEmptyAttempt()
  const correctParams: Array<Record<string, string>> = [
    { reagent: 'Phosphoric', concentration: 'standard' },
    { reagent: 'water', concentration: 'adjusted' },
    { temperature: 'warm' },
    { duration: 'standard' },
    { filtration: 'standard' },
  ]
  for (const params of correctParams) {
    attempt = executeStep(RECIPE_EP01, attempt, params)
  }
  return attempt
}

// 事故を発生させる試行状態（手順1で塩酸・高温を選ぶ + さらに2手順ミスして failed にする）
function createAccidentAttempt(): RecipeAttempt {
  let attempt = createEmptyAttempt()
  attempt = executeStep(RECIPE_EP01, attempt, { reagent: 'HCl', concentration: 'strong', temperature: 'hot' } as Record<string, string>)
  attempt = executeStep(RECIPE_EP01, attempt, { reagent: 'wrong', concentration: 'wrong' } as Record<string, string>)
  attempt = executeStep(RECIPE_EP01, attempt, { temperature: 'wrong' } as Record<string, string>)
  const correctParams: Array<Record<string, string>> = [
    { duration: 'standard' },
    { filtration: 'standard' },
  ]
  for (const params of correctParams) {
    attempt = executeStep(RECIPE_EP01, attempt, params)
  }
  return attempt
}

// 塩酸を選んだ試行状態（互換レイヤーでミス扱い）
function createHClAttempt(): RecipeAttempt {
  let attempt = createEmptyAttempt()
  attempt = executeStep(RECIPE_EP01, attempt, { reagent: 'HCl', concentration: 'strong' } as Record<string, string>)
  const correctParams: Array<Record<string, string>> = [
    { reagent: 'water', concentration: 'adjusted' },
    { temperature: 'warm' },
    { duration: 'standard' },
    { filtration: 'standard' },
  ]
  for (const params of correctParams) {
    attempt = executeStep(RECIPE_EP01, attempt, params)
  }
  return attempt
}

describe('[学習] 知識ノート', () => {
  it('EP01 のノートは6種ある', () => {
    expect(EP01_NOTES.map((n) => n.id)).toEqual([
      'rust',
      'black-rust',
      'chloride-rust',
      'acid-strength',
      'concentration',
      'heat-risk',
    ])
  })

  it('見出しは未獲得なら作中表現のみ、獲得後は化学名を併記する（二段表記）', () => {
    const note = getNote('black-rust')!
    expect(formatNoteTitle(note, false)).toBe('黒錆')
    expect(formatNoteTitle(note, true)).toBe('黒錆（Fe₃O₄）')
  })
})

describe('[学習] 段階解放', () => {
  it('初期状態では試薬だけが解放され、濃度・温度は選べない', () => {
    expect(isParamUnlocked('acid', OBSERVED)).toBe(true)
    expect(isParamUnlocked('concentration', OBSERVED)).toBe(false)
    expect(isParamUnlocked('temperature', OBSERVED)).toBe(false)
  })

  it('未解放の濃度・温度は安全な既定値（標準・中温）に固定される', () => {
    // 旧 RecipeAttempt 互換テスト: 段階解放ロジック自体は維持
    const wild = { acid: 'Phosphoric', concentration: 'strong', temperature: 'hot' } as any
    const constrained = applyUnlockConstraints(wild, OBSERVED) as any
    expect(constrained.concentration).toBe('standard')
    expect(constrained.temperature).toBe('warm')
    expect(constrained.acid).toBe('Phosphoric')
  })

  it('ノートを獲得すると対応パラメータが解放される', () => {
    const learned = toLearnedSet([...OBSERVED, 'concentration', 'heat-risk'])
    expect(isParamUnlocked('concentration', learned)).toBe(true)
    expect(isParamUnlocked('temperature', learned)).toBe(true)
    const wild = { acid: 'Phosphoric', concentration: 'strong', temperature: 'hot' } as any
    expect(applyUnlockConstraints(wild, learned)).toEqual(wild)
  })
})

describe('[学習] 練習処置とノート獲得', () => {
  it('完全修復の練習で「黒錆」と「濃さの加減」を学ぶ', () => {
    const perfectAttempt = createPerfectAttempt()
    const { result, newlyLearned } = executePractice(perfectAttempt, OBSERVED, 0)
    // 新APIでは recipeResult.qualityTier で判定
    expect(result.recipeResult.qualityTier).toBe('perfect')
    expect(newlyLearned).toContain('black-rust')
    expect(newlyLearned).toContain('concentration')
    expect(newlyLearned).not.toContain('heat-risk')
  })

  it('2回目の練習で「熱の危うさ」を学び、EP01 の全ノートが揃う', () => {
    const perfectAttempt = createPerfectAttempt()
    const first = executePractice(perfectAttempt, OBSERVED, 0)
    const learned1 = toLearnedSet([...OBSERVED, ...first.newlyLearned])
    const second = executePractice(perfectAttempt, learned1, 1)
    expect(second.newlyLearned).toContain('heat-risk')
    const all = toLearnedSet([...learned1, ...second.newlyLearned])
    expect([...all].sort()).toEqual(EP01_NOTES.map((n) => n.id).sort())
  })

  it('知識ゼロでも、練習を経て本番の完全修復に届く', () => {
    let learned = OBSERVED
    let count = 0
    for (let i = 0; i < 2; i++) {
      const p = executePractice(createPerfectAttempt(), learned, count)
      learned = toLearnedSet([...learned, ...p.newlyLearned])
      count++
    }
    const { fate } = executeTreatment(createPerfectAttempt())
    expect(fate.grade).toBe('PERFECT')
  })
})

describe('[学習] 予想フェーズ', () => {
  it('結果カテゴリ: 完全修復は clean、事故条件は danger', () => {
    const perfectAttempt = createPerfectAttempt()
    expect(categorizeOutcome(executeTreatment(perfectAttempt), perfectAttempt)).toBe('clean')
    const accidentAttempt = createAccidentAttempt()
    // 事故判定は品質段階 failed で代替（危険な手順を選んだ場合）
    expect(categorizeOutcome(executeTreatment(accidentAttempt), accidentAttempt)).toBe('danger')
  })

  it('予想が当たれば肯定、外れれば分析メモへ誘導する', () => {
    const result = executeTreatment(createPerfectAttempt())
    expect(evaluatePrediction('clean', result).correct).toBe(true)
    const miss = evaluatePrediction('weak', result)
    expect(miss.correct).toBe(false)
    expect(miss.comment).toContain('分析メモ')
  })
})

describe('[学習] 分析メモ', () => {
  it('塩酸ミスの原因を、ノート獲得前は作中表現、獲得後は化学名併記で説明する', () => {
    const attempt = createHClAttempt()
    const result = executeTreatment(attempt)
    const before = buildAnalysisMemo(attempt, result, NONE)
    expect(before.join()).toContain('白っぽい錆')
    expect(before.join()).not.toContain('塩化物錆')
    const after = buildAnalysisMemo(attempt, result, toLearnedSet(['chloride-rust']))
    expect(after.join()).toContain('白っぽい錆（塩化物錆）')
  })

  it('完全修復では処方が合っていたことを返す', () => {
    const memo = buildAnalysisMemo(createPerfectAttempt(), executeTreatment(createPerfectAttempt()), OBSERVED)
    expect(memo.join()).toContain('観察通りの処方')
  })
})

describe('[学習] ヒントの出し分け', () => {
  it('未獲得の概念に触れるヒントは出さない', () => {
    expect(visibleHints(REQUEST_CARD.hints, NONE)).toEqual([REQUEST_CARD.hints[3]])
    expect(visibleHints(REQUEST_CARD.hints, toLearnedSet(['chloride-rust']))).toEqual([
      REQUEST_CARD.hints[0],
      REQUEST_CARD.hints[1],
      REQUEST_CARD.hints[3],
    ])
    expect(visibleHints(REQUEST_CARD.hints, toLearnedSet(['chloride-rust', 'heat-risk']))).toEqual(
      REQUEST_CARD.hints,
    )
  })
})