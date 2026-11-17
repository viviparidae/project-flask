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
import { REQUEST_CARD, createEmptyAttempt, executeTreatment } from '../src/lib/treatmentEngine'
import type { RecipeAttempt } from '../src/lib/recipeEngine'

/**
 * [EP01 学習ループ検証 / 試作]
 * 設計: docs/design/learning-progression.md
 * 観察 → 予想 → 実験（練習処置）→ 解説 → ノート獲得 の1周を検証する。
 */

/** 観察パートで得られる初期ノート（試作ではラボ入室時に付与） */
const OBSERVED = toLearnedSet(['rust', 'chloride-rust', 'acid-strength'])
const NONE = toLearnedSet([])

const CORRECT: RecipeAttempt = {
  ...createEmptyAttempt(),
  acid: 'Phosphoric',
  concentration: 'standard',
  temperature: 'warm',
  procedure: 'standard',
  reaction: 'standard',
  filtration: 'standard',
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
    const wild: RecipeAttempt = { ...CORRECT, concentration: 'strong', temperature: 'hot' }
    const constrained = applyUnlockConstraints(wild, OBSERVED)
    expect(constrained.concentration).toBe('standard')
    expect(constrained.temperature).toBe('warm')
    expect(constrained.acid).toBe('Phosphoric')
  })

  it('ノートを獲得すると対応パラメータが解放される', () => {
    const learned = toLearnedSet([...OBSERVED, 'concentration', 'heat-risk'])
    expect(isParamUnlocked('concentration', learned)).toBe(true)
    expect(isParamUnlocked('temperature', learned)).toBe(true)
    const wild: RecipeAttempt = { ...CORRECT, concentration: 'strong', temperature: 'hot' }
    expect(applyUnlockConstraints(wild, learned)).toEqual(wild)
  })
})

describe('[学習] 練習処置とノート獲得', () => {
  it('リン酸の練習で黒錆が落ちる様子を見て「黒錆」と「濃さの加減」を学ぶ', () => {
    const { result, newlyLearned } = executePractice(CORRECT, OBSERVED, 0)
    expect(result.reactionResult.corrosionRemoved).toBe(100)
    expect(newlyLearned).toContain('black-rust')
    expect(newlyLearned).toContain('concentration')
    expect(newlyLearned).not.toContain('heat-risk')
  })

  it('2回目の練習で「熱の危うさ」を学び、EP01 の全ノートが揃う', () => {
    const first = executePractice(CORRECT, OBSERVED, 0)
    const learned1 = toLearnedSet([...OBSERVED, ...first.newlyLearned])
    const second = executePractice({ ...CORRECT, temperature: 'hot' }, learned1, 1)
    expect(second.newlyLearned).toContain('heat-risk')
    const all = toLearnedSet([...learned1, ...second.newlyLearned])
    expect([...all].sort()).toEqual(EP01_NOTES.map((n) => n.id).sort())
  })

  it('知識ゼロでも、選べるのは試薬だけの状態から練習を経て本番の完全修復に届く', () => {
    // 観察済みの状態から開始し、練習2回で全パラメータ解放 → 本番
    let learned = OBSERVED
    let count = 0
    for (let i = 0; i < 2; i++) {
      const p = executePractice(CORRECT, learned, count)
      learned = toLearnedSet([...learned, ...p.newlyLearned])
      count++
    }
    const { fate } = executeTreatment(applyUnlockConstraints(CORRECT, learned))
    expect(fate.grade).toBe('PERFECT')
  })
})

describe('[学習] 予想フェーズ', () => {
  it('結果カテゴリ: 完全修復は clean、ガス事故は danger', () => {
    expect(categorizeOutcome(executeTreatment(CORRECT))).toBe('clean')
    const accident = executeTreatment({
      ...CORRECT,
      acid: 'HCl',
      concentration: 'strong',
      temperature: 'hot',
    })
    expect(categorizeOutcome(accident)).toBe('danger')
  })

  it('予想が当たれば肯定、外れれば分析メモへ誘導する', () => {
    const result = executeTreatment(CORRECT)
    expect(evaluatePrediction('clean', result).correct).toBe(true)
    const miss = evaluatePrediction('weak', result)
    expect(miss.correct).toBe(false)
    expect(miss.comment).toContain('分析メモ')
  })
})

describe('[学習] 分析メモ', () => {
  it('塩酸ミスの原因を、ノート獲得前は作中表現、獲得後は化学名併記で説明する', () => {
    const attempt: RecipeAttempt = { ...CORRECT, acid: 'HCl' }
    const result = executeTreatment(attempt)
    const before = buildAnalysisMemo(attempt, result, NONE)
    expect(before.join()).toContain('白っぽい錆')
    expect(before.join()).not.toContain('塩化物錆')
    const after = buildAnalysisMemo(attempt, result, toLearnedSet(['chloride-rust']))
    expect(after.join()).toContain('白っぽい錆（塩化物錆）')
  })

  it('完全修復では処方が合っていたことを返す', () => {
    const memo = buildAnalysisMemo(CORRECT, executeTreatment(CORRECT), OBSERVED)
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
