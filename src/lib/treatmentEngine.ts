/**
 * treatmentEngine.ts — 化学処置レシピエンジン
 *
 * 既存の reactionEngine.ts / recipeEngine.ts をラップし、
 * VA-11 風 UI（選択グリッド）から呼び出せるインターフェースを提供。
 */

import {
  RECIPE_EP01,
  type Recipe,
  type RecipeAttempt,
  type RecipeResult,
  type AcidChoice,
  type AcidQuantity,
  type ConcChoice,
  type ConcQuantity,
  type TempChoice,
  type TempQuantity,
  type ProcChoice,
  type ProcQuantity,
  ACID_LABELS,
  CONC_LABELS,
  TEMP_LABELS,
  PROC_LABELS,
  matchRecipe,
} from './recipeEngine'
import { calculateReaction, type ReactionResult } from './reactionEngine'
import { judgeRestoration, type FateOutcome } from './fateEngine'

// ────────────────────────────────────────
// 型再エクスポート
// ────────────────────────────────────────
export type { RecipeAttempt, RecipeResult, Recipe, AcidChoice, AcidQuantity, ConcChoice, ConcQuantity, TempChoice, TempQuantity, ProcChoice, ProcQuantity }

// ────────────────────────────────────────
// UI 向け型定義（選択グリッド用）
// ────────────────────────────────────────
export type ParamGroup = {
  key: string
  label: string
  options: string[]           // 種類選択肢
  labels: Record<string, { short: string; note: string }>
  qtyOptions: string[]        // 量選択肢
  qtyLabels: Record<string, string>
}

export const PARAM_GROUPS: ParamGroup[] = [
  {
    key: 'acid',
    label: '試薬',
    options: ['HCl', 'Citric', 'Phosphoric'],
    labels: ACID_LABELS as Record<string, { short: string; note: string }>,
    qtyOptions: ['small', 'medium', 'large'],
    qtyLabels: { small: '少なめ', medium: '標準', large: 'たっぷり' },
  },
  {
    key: 'concentration',
    label: '濃度',
    options: ['light', 'standard', 'strong'],
    labels: CONC_LABELS as Record<string, { short: string; note: string }>,
    qtyOptions: ['low', 'medium', 'high'],
    qtyLabels: { low: '薄め', medium: '中', high: '濃め' },
  },
  {
    key: 'temperature',
    label: '温度',
    options: ['cold', 'warm', 'hot'],
    labels: TEMP_LABELS as Record<string, { short: string; note: string }>,
    qtyOptions: ['low', 'medium', 'high'],
    qtyLabels: { low: '低め', medium: '中', high: '高め' },
  },
  {
    key: 'procedure',
    label: '手順',
    options: ['quick', 'standard'],
    labels: PROC_LABELS as Record<string, { short: string; note: string }>,
    qtyOptions: ['basic', 'advanced'],
    qtyLabels: { basic: 'シンプル', advanced: '手間をかける' },
  },
  {
    key: 'reaction',
    label: '反応時間',
    options: ['quick', 'standard'],
    labels: PROC_LABELS as Record<string, { short: string; note: string }>,
    qtyOptions: ['basic', 'advanced'],
    qtyLabels: { basic: '短め', advanced: 'しっかり' },
  },
  {
    key: 'filtration',
    label: '濾過',
    options: ['quick', 'standard'],
    labels: PROC_LABELS as Record<string, { short: string; note: string }>,
    qtyOptions: ['basic', 'advanced'],
    qtyLabels: { basic: 'ざっと', advanced: '丁寧に' },
  },
]

// 解放順序
export const PARAM_ORDER = ['acid', 'concentration', 'temperature', 'procedure', 'reaction', 'filtration']

// ────────────────────────────────────────
// 空の試行状態作成
// ────────────────────────────────────────
export function createEmptyAttempt(): RecipeAttempt {
  return {
    acid: 'HCl',
    acidQty: 'medium',
    concentration: 'light',
    concentrationQty: 'medium',
    temperature: 'cold',
    temperatureQty: 'medium',
    procedure: 'quick',
    procedureQty: 'basic',
    reaction: 'quick',
    filtration: 'quick',
  }
}

// ────────────────────────────────────────
// 選択変更適用
// ────────────────────────────────────────
export function applyTypeChoice(attempt: RecipeAttempt, key: string, value: string): RecipeAttempt {
  const next = { ...attempt }
  ;(next as any)[key] = value
  return next
}

export function applyQtyChoice(attempt: RecipeAttempt, key: string, value: string): RecipeAttempt {
  const next = { ...attempt }
  ;(next as any)[`${key}Qty`] = value
  return next
}

// ────────────────────────────────────────
// プレビュー用：現在の選択から概算表示文字列生成
// ────────────────────────────────────────
export function getPreviewText(attempt: RecipeAttempt): { line1: string; line2: string } {
  const acidName = ACID_LABELS[attempt.acid as AcidChoice].short
  const concName = CONC_LABELS[attempt.concentration as ConcChoice].short
  const tempName = TEMP_LABELS[attempt.temperature as TempChoice].short
  const procName = PROC_LABELS[attempt.procedure as ProcChoice].short

  return {
    line1: `${acidName}（${attempt.acidQty}） + ${concName}（${attempt.concentrationQty}）`,
    line2: `${tempName}・${procName} を選択中`,
  }
}

// ────────────────────────────────────────
// 実行判定（フルパイプライン）
// ────────────────────────────────────────
export type TreatmentResult = {
  recipeResult: RecipeResult
  reactionResult: ReactionResult
  fate: FateOutcome
}

export function executeTreatment(attempt: RecipeAttempt, recipe: Recipe = RECIPE_EP01): TreatmentResult {
  // 1. レシピ照合（危険判定含む）
  const recipeResult = matchRecipe(recipe, attempt)

  // 2. 化学反応計算（レシピ照合が事故でない場合のみ）
  let reactionResult: ReactionResult
  if (recipeResult.isAccident) {
    // 事故時はダミー値
    reactionResult = {
      restorationScore: 0,
      corrosionRemoved: 0,
      metalDamage: 100,
      byproductHazard: true,
    }
  } else {
    reactionResult = calculateReaction({
      acidType: attempt.acid,
      concentration: attempt.concentration === 'light' ? 2 : attempt.concentration === 'standard' ? 3 : 5,
      temperature: attempt.temperature === 'cold' ? 55 : attempt.temperature === 'warm' ? 75 : 90,
    })
  }

  // 3. 因果判定
  const fate = judgeRestoration(reactionResult.restorationScore, reactionResult.byproductHazard)

  return { recipeResult, reactionResult, fate }
}

// ────────────────────────────────────────
// 依頼カード情報（エピソード1固定）
// ────────────────────────────────────────
export const REQUEST_CARD = {
  name: RECIPE_EP01.name,
  compound: RECIPE_EP01.compound,
  hints: RECIPE_EP01.hints,
}

// ────────────────────────────────────────
// グレード表示用
// ────────────────────────────────────────
export const GRADE_CONFIG: Record<string, { emoji: string; color: number; label: string }> = {
  PERFECT: { emoji: '✨', color: 0x65e6ad, label: 'PERFECT' },
  GOOD: { emoji: '🗡️', color: 0x8bcfef, label: 'GOOD' },
  PARTIAL: { emoji: '⚠️', color: 0xf6c94e, label: 'PARTIAL' },
  DAMAGED: { emoji: '💀', color: 0xf87171, label: 'DAMAGED' },
  ACCIDENT: { emoji: '💥', color: 0xf87171, label: 'ACCIDENT' },
}

export const GRADE_EMOJIS: Record<string, string> = {
  PERFECT: '✨', GOOD: '🗡️', PARTIAL: '⚠️', DAMAGED: '💀', ACCIDENT: '💥',
}