/**
 * treatmentEngine.ts — レシピ実行エンジン（新設計）
 *
 * 「レシピ提示＋手順実行」モデル:
 * - プレイヤーは手順を順に実行するだけ
 * - 配合・濃度・温度の数値選択は UI から外す
 * - 正しい手順で作れば成功
 * - 手順ミスは品質段階と依頼人の反応の小分岐にだけ効かせる
 */

import { RECIPE_EP01, type Recipe, type RecipeAttempt, type RecipeResult, evaluateRecipe, executeStep, createEmptyAttempt, REQUEST_CARD } from './recipeEngine'
import { judgeRestoration, type FateOutcome } from './fateEngine'

// ────────────────────────────────────────
// 型再エクスポート
// ────────────────────────────────────────
export type { Recipe, RecipeAttempt, RecipeResult, RecipeStep } from './recipeEngine'
export {
  RECIPE_EP01,
  RECIPE_EP02,
  RECIPE_EP03,
  RECIPE_BOOK_EP01,
  RECIPE_BOOK_DAY1,
  REQUEST_CARD,
  createEmptyAttempt,
  executeStep,
  evaluateRecipe,
} from './recipeEngine'

// ────────────────────────────────────────
// 実行結果（統合）
// ────────────────────────────────────────
export type TreatmentResult = {
  recipeResult: RecipeResult
  fate: FateOutcome
}

// ────────────────────────────────────────
// 品質段階から修復スコアへのマッピング
// ────────────────────────────────────────
function qualityTierToScore(tier: RecipeResult['qualityTier']): number {
  switch (tier) {
    case 'perfect': return 100
    case 'good': return 70
    case 'partial': return 40
    case 'failed': return 10
  }
}

// ────────────────────────────────────────
// 実行判定（新パイプライン）
// ────────────────────────────────────────
export function executeTreatment(
  attempt: RecipeAttempt,
  recipe: Recipe = RECIPE_EP01
): TreatmentResult {
  // レシピ評価
  const recipeResult = evaluateRecipe(recipe, attempt)

  // 品質段階から修復スコアを算出
  const restorationScore = qualityTierToScore(recipeResult.qualityTier)

  // 因果判定（有害副産物フラグは新設計では常に false）
  const fate = judgeRestoration(restorationScore, false)

  return { recipeResult, fate }
}

// ────────────────────────────────────────
// グレード表示用（互換用）
// ────────────────────────────────────────
export const GRADE_CONFIG: Record<string, { emoji: string; color: number; label: string }> = {
  PERFECT: { emoji: '✨', color: 0x65e6ad, label: 'PERFECT' },
  GOOD: { emoji: '🗡️', color: 0x8bcfef, label: 'GOOD' },
  PARTIAL: { emoji: '⚠️', color: 0xf6c94e, label: 'PARTIAL' },
  DAMAGED: { emoji: '💀', color: 0xf87171, label: 'DAMAGED' },
  ACCIDENT: { emoji: '💥', color: 0xf87171, label: 'ACCIDENT' },
}

export const GRADE_EMOJIS: Record<string, string> = {
  PERFECT: '✨',
  GOOD: '🗡️',
  PARTIAL: '⚠️',
  DAMAGED: '💀',
  ACCIDENT: '💥',
}