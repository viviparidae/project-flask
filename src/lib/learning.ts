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
 * Phase 1 注意: 新設計の TreatmentResult に合わせて互換層を追加。
 * 旧 reactionEngine の数値計算（corrosionRemoved, metalDamage, byproductHazard 等）は
 * 新設計では品質段階（perfect/good/partial/failed）に置き換わったため、
 * 学習ロジック用に擬似的な数値を提供する互換関数を用意する。
 */

import { getNote } from './knowledge'
import type { RecipeAttempt } from './recipeEngine'
import { executeTreatment, type TreatmentResult } from './treatmentEngine'
import { RECIPE_EP01, type Recipe, evaluateRecipe } from './recipeEngine'

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
 * Phase 1: 新 RecipeAttempt 形式（手順実行型）では不要なので no-op。
 */
export function applyUnlockConstraints(attempt: RecipeAttempt, learned: LearnedSet): RecipeAttempt {
  // 旧形式（パラメータ選択型）の場合のみ制約を適用
  const legacyAttempt = attempt as any
  if ('concentration' in legacyAttempt || 'temperature' in legacyAttempt) {
    const next = { ...legacyAttempt }
    if (!isParamUnlocked('concentration', learned)) next.concentration = 'standard'
    if (!isParamUnlocked('temperature', learned)) next.temperature = 'warm'
    return next
  }
  // 新形式（手順実行型）はそのまま返す
  return attempt
}

// ────────────────────────────────────────
// 互換層: 新設計の品質段階から旧 reactionEngine 風の数値を生成
// ────────────────────────────────────────

interface LegacyReactionResult {
  restorationScore: number
  corrosionRemoved: number
  metalDamage: number
  byproductHazard: boolean
}

interface LegacyRecipeResult {
  isAccident: boolean
  matchScore: number
  detail: {
    acid: boolean
    concentration: boolean
    temperature: boolean
    procedure: boolean
    reaction: boolean
    filtration: boolean
  }
  grade: 'PERFECT' | 'GOOD' | 'PARTIAL' | 'FAIL' | 'ACCIDENT'
}

interface LegacyTreatmentResult {
  recipeResult: LegacyRecipeResult
  reactionResult: LegacyReactionResult
  fate: import('./fateEngine').FateOutcome
}

/** 品質段階から旧形式の reactionResult を生成 */
function qualityTierToLegacyReaction(tier: string, attempt?: RecipeAttempt): LegacyReactionResult {
  switch (tier) {
    case 'perfect':
      return { restorationScore: 100, corrosionRemoved: 100, metalDamage: 0, byproductHazard: false }
    case 'good':
      return { restorationScore: 70, corrosionRemoved: 85, metalDamage: 5, byproductHazard: false }
    case 'partial':
      return { restorationScore: 40, corrosionRemoved: 60, metalDamage: 15, byproductHazard: false }
    case 'failed':
      // 事故条件（塩酸＋高濃度＋高温）を手順から検出
      const hasAccident = attempt?.completedSteps.some(s =>
        s.playerParams.reagent === 'HCl' && s.playerParams.concentration === 'strong' && s.playerParams.temperature === 'hot'
      ) ?? false
      return { restorationScore: 10, corrosionRemoved: 30, metalDamage: 50, byproductHazard: hasAccident }
    default:
      return { restorationScore: 0, corrosionRemoved: 0, metalDamage: 50, byproductHazard: false }
  }
}

/** 新 TreatmentResult を旧互換形式に変換 */
function toLegacyTreatmentResult(result: TreatmentResult, attempt?: RecipeAttempt): LegacyTreatmentResult {
  const tier = result.recipeResult.qualityTier
  const legacyReaction = qualityTierToLegacyReaction(tier, attempt)

  // 旧 matchScore: 正解手順数（最大5→6にスケール）
  const matchScore = Math.round((result.recipeResult.progress.completed / result.recipeResult.progress.total) * 6)
  const legacyGrade = tier === 'perfect' ? 'PERFECT' : tier === 'good' ? 'GOOD' : tier === 'partial' ? 'PARTIAL' : 'FAIL'

  // 手順ミスから detail を構築
  const detail = {
    acid: !result.recipeResult.mistakes.some(m => m.stepId === 0),
    concentration: !result.recipeResult.mistakes.some(m => m.stepId === 1),
    temperature: !result.recipeResult.mistakes.some(m => m.stepId === 2),
    procedure: !result.recipeResult.mistakes.some(m => m.stepId === 3),
    reaction: true,
    filtration: !result.recipeResult.mistakes.some(m => m.stepId === 4),
  }

  return {
    recipeResult: {
      isAccident: legacyReaction.byproductHazard,
      matchScore,
      detail,
      grade: legacyGrade,
    },
    reactionResult: legacyReaction,
    fate: result.fate,
  }
}

// ────────────────────────────────────────
// 練習処置（テストピース）
// ────────────────────────────────────────

export type PracticeResult = {
  attempt: RecipeAttempt
  result: TreatmentResult
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

  // 旧互換形式で判定ロジックを維持
  const legacy = toLegacyTreatmentResult(result, attempt)
  const reactionResult = legacy.reactionResult

  gain('black-rust', reactionResult.corrosionRemoved > 50)
  gain('concentration', practiceCountAfter >= 1)
  gain('heat-risk', practiceCountAfter >= 2) // 簡略化: 練習回数ベース

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

/** 結果を予想カテゴリに分類する（旧互換形式を使用） */
export function categorizeOutcome(result: TreatmentResult, attempt?: RecipeAttempt): PredictionId {
  const legacy = toLegacyTreatmentResult(result, attempt)
  const { reactionResult, fate } = legacy

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
  attempt?: RecipeAttempt,
): PredictionVerdict {
  const category = categorizeOutcome(result, attempt)
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
  const legacy = toLegacyTreatmentResult(result, attempt)
  const { recipeResult, reactionResult, fate } = legacy
  const detail = recipeResult.detail

  if (reactionResult.byproductHazard) {
    lines.push(
      `塩酸を濃く熱したため、刺激のある気体が出た。${termFor('heat-risk', learned)}の典型的な事故だ。`,
    )
    return lines
  }

  // 手順0（酸選択）のミスをチェック
  const step0Mistake = result.recipeResult.mistakes.find(m => m.stepId === 0)
  if (step0Mistake) {
    const reagent = step0Mistake.playerParams.reagent
    if (reagent === 'HCl') {
      lines.push(
        `塩酸は${termFor('chloride-rust', learned)}を悪化させる。この剣の錆には合っていない。`,
      )
    } else if (reagent === 'Citric') {
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
    const step2 = attempt.completedSteps.find(s => s.stepId === 2)
    if (step2?.playerParams.temperature === 'hot') {
      lines.push(`熱くしすぎた。反応は速くなるが、金属への負担も増える。${termFor('heat-risk', learned)}。`)
    } else {
      lines.push(`温度が適切でなかった。${termFor('heat-risk', learned)}。`)
    }
  }

  const step3 = attempt.completedSteps.find(s => s.stepId === 3)
  if (step3?.playerParams.duration === 'quick' && fate.grade !== 'PERFECT') {
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