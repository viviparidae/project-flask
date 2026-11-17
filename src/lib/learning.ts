/**
 * learning.ts — 学習進行ロジック（EP01 試作）
 *
 * 学習プログレッション設計（docs/design/learning-progression.md）の実装:
 * - パラメータの段階解放（知識ノートと連動）
 * - 練習処置（テストピース）と、そこからのノート獲得
 * - 予想フェーズの評価
 * - 結果の分析メモ（失敗・成功の要因分解）
 * - ヒントの出し分け（獲得済みノートの範囲だけ）
 *
 * 勝敗の数値仕様には触れない。判定は treatmentEngine.executeTreatment に委ねる。
 */

import { getNote } from './knowledge'
import type { RecipeAttempt } from './recipeEngine'
import { executeTreatment, type TreatmentResult } from './treatmentEngine'

export type LearnedSet = ReadonlySet<string>

export function toLearnedSet(ids: readonly string[]): Set<string> {
  return new Set(ids)
}

// ────────────────────────────────────────
// 段階解放
// ────────────────────────────────────────

/** パラメータ解放に必要なノート。null は常時解放 */
export const PARAM_UNLOCK_NOTES: Record<string, string | null> = {
  acid: null,
  concentration: 'concentration',
  temperature: 'heat-risk',
  procedure: null,
  reaction: null,
  filtration: null,
}

export function isParamUnlocked(paramKey: string, learned: LearnedSet): boolean {
  const required = PARAM_UNLOCK_NOTES[paramKey]
  if (required === undefined) return true
  return required === null || learned.has(required)
}

/**
 * 未解放パラメータを安全な既定値に固定する。
 * 濃度は「標準」、温度は「中温」＝化学者が下準備した状態として扱う。
 */
export function applyUnlockConstraints(attempt: RecipeAttempt, learned: LearnedSet): RecipeAttempt {
  const next = { ...attempt }
  if (!isParamUnlocked('concentration', learned)) next.concentration = 'standard'
  if (!isParamUnlocked('temperature', learned)) next.temperature = 'warm'
  return next
}

// ────────────────────────────────────────
// 練習処置（テストピース）
// ────────────────────────────────────────

export type PracticeResult = {
  /** 制約適用後の試行 */
  attempt: RecipeAttempt
  result: TreatmentResult
  /** この練習で新規に獲得したノート ID */
  newlyLearned: string[]
}

/**
 * 練習で「現象を観察した」ことによるノート獲得の判定。
 * - リン酸で黒錆が落ちる様子を見る → 黒錆
 * - 練習を1回やり切る → 濃さの加減
 * - 高温を試す、または練習を2回やる → 熱の危うさ
 */
export function evaluatePracticeLearning(
  attempt: RecipeAttempt,
  result: TreatmentResult,
  learned: LearnedSet,
  practiceCountAfter: number,
): string[] {
  const gained: string[] = []
  const gain = (id: string, cond: boolean) => {
    if (cond && !learned.has(id) && !gained.includes(id)) gained.push(id)
  }
  gain('black-rust', attempt.acid === 'Phosphoric' && result.reactionResult.corrosionRemoved > 0)
  gain('concentration', practiceCountAfter >= 1)
  gain('heat-risk', attempt.temperature === 'hot' || practiceCountAfter >= 2)
  return gained
}

export function executePractice(
  attempt: RecipeAttempt,
  learned: LearnedSet,
  practiceCount: number,
): PracticeResult {
  const constrained = applyUnlockConstraints(attempt, learned)
  const result = executeTreatment(constrained)
  const newlyLearned = evaluatePracticeLearning(constrained, result, learned, practiceCount + 1)
  return { attempt: constrained, result, newlyLearned }
}

// ────────────────────────────────────────
// 予想フェーズ
// ────────────────────────────────────────

export type PredictionId = 'clean' | 'scraped' | 'weak' | 'danger'

export const PREDICTIONS: { id: PredictionId; label: string }[] = [
  { id: 'clean', label: '錆だけが落ちて、刃は無事だと思う' },
  { id: 'scraped', label: '錆は落ちるが、刃も傷みそう' },
  { id: 'weak', label: 'ほとんど落ちないと思う' },
  { id: 'danger', label: '何か危ないことが起きそう' },
]

/** 結果を予想カテゴリに分類する */
export function categorizeOutcome(result: TreatmentResult): PredictionId {
  const { reactionResult, fate } = result
  if (reactionResult.byproductHazard) return 'danger'
  if (fate.grade === 'PERFECT' || fate.grade === 'GOOD') return 'clean'
  if (reactionResult.metalDamage >= 20) return 'scraped'
  return 'weak'
}

export type PredictionVerdict = {
  correct: boolean
  category: PredictionId
  comment: string
}

export function evaluatePrediction(
  prediction: PredictionId,
  result: TreatmentResult,
): PredictionVerdict {
  const category = categorizeOutcome(result)
  const correct = prediction === category
  const categoryLabel = PREDICTIONS.find((p) => p.id === category)?.label ?? category
  return {
    correct,
    category,
    comment: correct
      ? '予想通りになった。観察が処方に結びついている。'
      : `実際は「${categoryLabel}」という結果だった。なぜそうなったか、分析メモで確認しよう。`,
  }
}

// ────────────────────────────────────────
// 分析メモ（要因分解）
// ────────────────────────────────────────

function termFor(noteId: string, learned: LearnedSet): string {
  const note = getNote(noteId)
  if (!note) return noteId
  return learned.has(noteId) && note.chemTerm
    ? `${note.worldTerm}（${note.chemTerm}）`
    : note.worldTerm
}

/**
 * 結果の要因を平易な言葉で分解する。
 * 触れる概念は、獲得済みなら化学名を併記し、未獲得なら作中表現で述べる。
 */
export function buildAnalysisMemo(
  attempt: RecipeAttempt,
  result: TreatmentResult,
  learned: LearnedSet,
): string[] {
  const lines: string[] = []
  const { recipeResult, reactionResult, fate } = result
  const detail = recipeResult.detail

  if (reactionResult.byproductHazard) {
    lines.push(
      `塩酸を濃く熱したため、刺激のある気体が出た。${termFor('heat-risk', learned)}の典型的な事故だ。`,
    )
    return lines
  }

  if (!detail.acid) {
    if (attempt.acid === 'HCl') {
      lines.push(
        `塩酸は${termFor('chloride-rust', learned)}を悪化させる。この剣の錆には合っていない。`,
      )
    } else if (attempt.acid === 'Citric') {
      lines.push('クエン酸は穏やかすぎて、この厚い錆には届かなかった。酸の選択が原因だ。')
    } else {
      lines.push('選んだ酸が、この錆の性質に合っていない。')
    }
  }

  if (!detail.concentration && reactionResult.metalDamage > 0) {
    lines.push(
      `濃すぎて、錆だけでなく金属まで攻撃してしまった（侵食 ${reactionResult.metalDamage}%）。${termFor('concentration', learned)}の問題だ。`,
    )
  } else if (!detail.concentration) {
    lines.push(`薄すぎて深部の錆に届かなかった。${termFor('concentration', learned)}の問題だ。`)
  }

  if (!detail.temperature) {
    if (attempt.temperature === 'hot') {
      lines.push(`熱くしすぎた。反応は速くなるが、金属への負担も増える。${termFor('heat-risk', learned)}。`)
    } else if (attempt.temperature === 'cold') {
      lines.push('冷たいままでは反応が遅く、錆が落ちきらなかった。')
    }
  }

  if (attempt.procedure === 'quick' && fate.grade !== 'PERFECT') {
    lines.push('処置の時間が短く、深部の錆が残った。時間をかける手順が必要だった。')
  }

  if (fate.grade === 'PERFECT') {
    lines.push('酸・濃さ・熱の加減が、この錆の性質に合っていた。観察通りの処方だ。')
  } else if (lines.length === 0) {
    lines.push('大きな間違いはないが、詰めが甘く錆が残った。')
  }

  return lines
}

// ────────────────────────────────────────
// ヒントの出し分け
// ────────────────────────────────────────

/** REQUEST_CARD.hints の各行に必要なノート（null は常時表示） */
export const HINT_REQUIREMENTS: (string | null)[] = [
  'chloride-rust',
  'chloride-rust',
  'heat-risk',
  null,
]

export function visibleHints(hints: string[], learned: LearnedSet): string[] {
  return hints.filter((_, i) => {
    const required = HINT_REQUIREMENTS[i]
    return required == null || learned.has(required)
  })
}
