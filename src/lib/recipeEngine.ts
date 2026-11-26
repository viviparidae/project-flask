/**
 * recipeEngine.ts — レシピ定義・ステップ実行エンジン
 *
 * 新設計: レシピカードに材料・手順・「なぜこの手順か」を提示し、
 * プレイヤーは手順を順番に実行するだけ。
 * 配合・濃度・温度の数値選択は UI から外す。
 */

// ────────────────────────────────────────
// レシピ手順の型
// ────────────────────────────────────────
export type RecipeStep = {
  /** 手順ID（順序） */
  id: number
  /** 表示用ラベル（例: "リン酸を加える"） */
  label: string
  /** なぜこの手順なのか（1行） */
  reason: string
  /** 正解のアクション種別（将来拡張用） */
  actionType: 'add_reagent' | 'heat' | 'wait' | 'filter'
  /** 正解パラメータ（レシピ記載内容） */
  correctParams: {
    reagent?: string
    concentration?: string
    temperature?: string
    duration?: string
    filtration?: string
  }
}

// ────────────────────────────────────────
// レシピ定義
// ────────────────────────────────────────
export type Recipe = {
  id: string
  name: string
  compound: string
  /** 材料リスト（表示用） */
  ingredients: string[]
  /** 手順リスト（順序通り実行） */
  steps: RecipeStep[]
  /** 危険な組み合わせ（事故判定） */
  isDangerous: (attempt: RecipeAttempt) => boolean
}

// ────────────────────────────────────────
// プレイヤーの試行状態（簡易版）
// ────────────────────────────────────────
export type RecipeAttempt = {
  /** 現在の手順インデックス（0-based） */
  currentStepIndex: number
  /** 完了済み手順の記録 */
  completedSteps: {
    stepId: number
    /** プレイヤーが選んだアクション（正解なら正解パラメータ、ミスなら別の値） */
    playerParams: Record<string, string>
    isCorrect: boolean
  }[]
  /** ミスした手順の数 */
  mistakeCount: number
}

// ────────────────────────────────────────
// 実行結果
// ────────────────────────────────────────
export type RecipeResult = {
  isComplete: boolean
  isAccident: boolean
  /** 品質段階: 'perfect' | 'good' | 'partial' | 'failed' */
  qualityTier: 'perfect' | 'good' | 'partial' | 'failed'
  /** 完了済み手順数 / 全手順数 */
  progress: { completed: number; total: number }
  /** ミスの詳細 */
  mistakes: { stepId: number; expected: string; actual: string; playerParams: Record<string, string> }[]
}

// ────────────────────────────────────────
// エピソード1 レシピ定義
// ────────────────────────────────────────
export const RECIPE_EP01: Recipe = {
  id: 'ep01-sword-restoration',
  name: '古剣 腐食除去処置',
  compound: 'リン酸洗浄液（pH 2〜3、温度 35〜45℃）',
  ingredients: [
    'リン酸 (H₃PO₄) — 標準濃度',
    '蒸留水 — 希釈用',
    '古剣（対象）',
    '耐熱ガラス容器',
    '濾過紙・漏斗',
  ],
  steps: [
    {
      id: 0,
      label: 'リン酸を標準濃度で準備する',
      reason: '塩化物錆に有効で、金属母材を傷めない濃度が標準濃度だから',
      actionType: 'add_reagent',
      correctParams: { reagent: 'Phosphoric', concentration: 'standard' },
    },
    {
      id: 1,
      label: '蒸留水で希釈してpH 2〜3に調整する',
      reason: '強すぎると鉄を侵食し、弱すぎると錆が落ちないから',
      actionType: 'add_reagent',
      correctParams: { reagent: 'water', concentration: 'adjusted' },
    },
    {
      id: 2,
      label: '中温（35〜45℃）で加温する',
      reason: '反応速度と安全性のバランスが取れる適温だから',
      actionType: 'heat',
      correctParams: { temperature: 'warm' },
    },
    {
      id: 3,
      label: '標準時間浸透させる',
      reason: '深部の塩化物錆まで届くには十分な時間が必要だから',
      actionType: 'wait',
      correctParams: { duration: 'standard' },
    },
    {
      id: 4,
      label: '丁寧に濾過して完成',
      reason: '不純物を取り除き、純度の高い洗浄液に仕上げるため',
      actionType: 'filter',
      correctParams: { filtration: 'standard' },
    },
  ],
  // 旧設計の危険条件（HCl + 濃め + 高温）をレシピ逸脱時の事故として残す
  isDangerous: (attempt) => false, // 新設計では手順実行なので事故判定は手順ミスで代替
}

// ────────────────────────────────────────
// エピソード2 レシピ定義（ナーラの染料調合）
// ────────────────────────────────────────
export const RECIPE_EP02: Recipe = {
  id: 'ep02-dye-mordant',
  name: '植物染料 媒染定着処理',
  compound: 'ベニバナ赤色素＋明礬媒染（pH 4〜5、温度 60〜70℃）',
  ingredients: [
    'ベニバナ（紅花）色素抽出液',
    '明礬（ミョウバン）媒染剤',
    '酢酸緩衝液 — pH調整用',
    '絹布（対象）',
    '温度計付き加熱鍋',
  ],
  steps: [
    {
      id: 0,
      label: '色素抽出液を準備する',
      reason: 'ベニバナの赤色素（カルタミン）は水溶性で熱に弱いから',
      actionType: 'add_reagent',
      correctParams: { reagent: 'safflower', concentration: 'extracted' },
    },
    {
      id: 1,
      label: '酢酸緩衝液でpH 4〜5に調整する',
      reason: '酸性側で色素が安定し、媒染反応が均一に進むから',
      actionType: 'add_reagent',
      correctParams: { reagent: 'acetate_buffer', concentration: 'ph4-5' },
    },
    {
      id: 2,
      label: '明礬媒染剤を加える',
      reason: 'アルミニウムイオンが色素とキレート錯体を形成し、繊維に定着させるから',
      actionType: 'add_reagent',
      correctParams: { reagent: 'alum', concentration: 'standard' },
    },
    {
      id: 3,
      label: '中温（60〜70℃）で加熱媒染する',
      reason: '媒染反応に必要な温度だが、沸騰させると色素が分解するから',
      actionType: 'heat',
      correctParams: { temperature: 'warm' },
    },
    {
      id: 4,
      label: '布を浸して冷却・水洗いして完成',
      reason: '冷却で錯体が安定し、未反応の媒染剤を除去するため',
      actionType: 'filter',
      correctParams: { filtration: 'rinse' },
    },
  ],
  isDangerous: (attempt) => false,
}

// ────────────────────────────────────────
// エピソード3 レシピ定義（小さな依頼：酸塩基中和）
// ────────────────────────────────────────
export const RECIPE_EP03: Recipe = {
  id: 'ep03-acid-neutralization',
  name: '廃酸 中和処理',
  compound: '炭酸水素ナトリウムによる中和（pH 6〜8、常温）',
  ingredients: [
    '廃硫酸（希薄）— 対象液',
    '炭酸水素ナトリウム（重曹）— 中和剤',
    'フェノールフタレイン指示薬 — 終点確認用',
    '耐酸性容器',
    'pH試験紙',
  ],
  steps: [
    {
      id: 0,
      label: '廃酸の量を測定し、容器に移す',
      reason: '中和に必要な重曹量を計算するため、正確な体積が必要だから',
      actionType: 'add_reagent',
      correctParams: { reagent: 'waste_acid', concentration: 'measured' },
    },
    {
      id: 1,
      label: '重曹を少しずつ加えて撹拌する',
      reason: '急激な発熱と二酸化炭素発生を防ぎ、安全に中和を進めるから',
      actionType: 'add_reagent',
      correctParams: { reagent: 'baking_soda', concentration: 'gradual' },
    },
    {
      id: 2,
      label: '指示薬で色変化（pH 8.2〜）を確認する',
      reason: 'フェノールフタレインは弱塩基性で紅色になり、中和終点が分かるから',
      actionType: 'wait',
      correctParams: { duration: 'indicator_check' },
    },
    {
      id: 3,
      label: 'pH試験紙で中性域（6〜8）を最終確認する',
      reason: '指示薬だけでは微細なpHズレが分からないため、二重確認で安全を担保するから',
      actionType: 'wait',
      correctParams: { duration: 'ph_check' },
    },
  ],
  isDangerous: (attempt) => false,
}

// ────────────────────────────────────────
// レシピブック
// ────────────────────────────────────────
export type RecipeBook = {
  episode: string
  recipes: Recipe[]
}

export const RECIPE_BOOK_EP01: RecipeBook = {
  episode: 'ep01',
  recipes: [RECIPE_EP01],
}

export const RECIPE_BOOK_DAY1: RecipeBook = {
  episode: 'day1',
  recipes: [RECIPE_EP01, RECIPE_EP02, RECIPE_EP03],
}

// ────────────────────────────────────────
// 互換性のための旧型定義（段階的移行用）
// ────────────────────────────────────────
export type AcidChoice = 'HCl' | 'Citric' | 'Phosphoric'
export type AcidQuantity = 'small' | 'medium' | 'large'
export type ConcChoice = 'light' | 'standard' | 'strong'
export type ConcQuantity = 'low' | 'medium' | 'high'
export type TempChoice = 'cold' | 'warm' | 'hot'
export type TempQuantity = 'low' | 'medium' | 'high'
export type ProcChoice = 'quick' | 'standard'
export type ProcQuantity = 'basic' | 'advanced'

// 旧 RecipeAttempt（互換用）
export type LegacyRecipeAttempt = {
  acid: AcidChoice
  acidQty: AcidQuantity
  concentration: ConcChoice
  concentrationQty: ConcQuantity
  temperature: TempChoice
  temperatureQty: TempQuantity
  procedure: ProcChoice
  procedureQty: ProcQuantity
  reaction: ProcChoice
  filtration: ProcChoice
}

// 旧 MatchDetail（互換用）
export type MatchDetail = {
  acid: boolean
  concentration: boolean
  temperature: boolean
  procedure: boolean
  reaction: boolean
  filtration: boolean
}

// 旧 RecipeResult（互換用）
export type LegacyRecipeResult = {
  isAccident: boolean
  matchScore: number
  detail: MatchDetail
  grade: 'PERFECT' | 'GOOD' | 'PARTIAL' | 'FAIL' | 'ACCIDENT'
}

// ────────────────────────────────────────
// 表示用ラベル（互換用）
// ────────────────────────────────────────
export const ACID_LABELS: Record<AcidChoice, { short: string; long: string; note: string }> = {
  HCl: { short: '塩酸', long: '塩酸 (HCl)', note: '強力・速効。塩化物錆には悪作用の危険あり' },
  Citric: { short: 'クエン酸', long: 'クエン酸', note: '穏やか・安全。高温・高濃度でないと効果薄' },
  Phosphoric: { short: 'リン酸', long: 'リン酸 (H₃PO₄)', note: '塩化物錆に有効。副産物が少なく扱いやすい' },
}

export const CONC_LABELS: Record<ConcChoice, { short: string; note: string }> = {
  light: { short: '薄め', note: '安全だが効果が弱い' },
  standard: { short: '標準', note: 'バランスが良い' },
  strong: { short: '濃め', note: '効果は高いが侵食リスクあり' },
}

export const TEMP_LABELS: Record<TempChoice, { short: string; note: string }> = {
  cold: { short: '低温', note: '反応が遅い。深部の錆に届きにくい' },
  warm: { short: '中温', note: '適温。反応速度と安全性のバランス良' },
  hot: { short: '高温', note: '反応が速いが金属へのダメージ増加' },
}

export const PROC_LABELS: Record<ProcChoice, { short: string; note: string }> = {
  quick: { short: '短時間処置', note: '表面の錆のみ除去。深部に届かない可能性' },
  standard: { short: '標準処置', note: '十分な浸透時間。深部の錆まで対処可能' },
}

// ────────────────────────────────────────
// 空の試行状態作成（新設計）
// ────────────────────────────────────────
export function createEmptyAttempt(): RecipeAttempt {
  return {
    currentStepIndex: 0,
    completedSteps: [],
    mistakeCount: 0,
  }
}

// ────────────────────────────────────────
// 手順実行
// ────────────────────────────────────────
export function executeStep(
  recipe: Recipe,
  attempt: RecipeAttempt,
  playerParams: Record<string, string>
): RecipeAttempt {
  const currentStep = recipe.steps[attempt.currentStepIndex]
  if (!currentStep) return attempt // 完了済み

  // 正解判定：プレイヤーの選択が正解パラメータと一致するか
  const isCorrect = Object.entries(currentStep.correctParams).every(
    ([key, expected]) => playerParams[key] === expected
  )

  const newAttempt: RecipeAttempt = {
    currentStepIndex: attempt.currentStepIndex + 1,
    completedSteps: [
      ...attempt.completedSteps,
      {
        stepId: currentStep.id,
        playerParams,
        isCorrect,
      },
    ],
    mistakeCount: attempt.mistakeCount + (isCorrect ? 0 : 1),
  }

  return newAttempt
}

// ────────────────────────────────────────
// 完了判定・品質評価
// ────────────────────────────────────────
export function evaluateRecipe(recipe: Recipe, attempt: RecipeAttempt): RecipeResult {
  const totalSteps = recipe.steps.length
  const completed = attempt.completedSteps.length
  const mistakes = attempt.completedSteps.filter((s) => !s.isCorrect)

  let qualityTier: RecipeResult['qualityTier'] = 'perfect'
  if (mistakes.length === 0) {
    qualityTier = 'perfect'
  } else if (mistakes.length === 1) {
    qualityTier = 'good'
  } else if (mistakes.length === 2) {
    qualityTier = 'partial'
  } else {
    qualityTier = 'failed'
  }

  const mistakeDetails = mistakes.map((m) => {
    const step = recipe.steps.find((s) => s.id === m.stepId)
    const expected = step ? JSON.stringify(step.correctParams) : 'unknown'
    return { stepId: m.stepId, expected, actual: JSON.stringify(m.playerParams), playerParams: m.playerParams }
  })

  return {
    isComplete: completed >= totalSteps,
    isAccident: false, // 新設計では事故は品質段階で表現
    qualityTier,
    progress: { completed, total: totalSteps },
    mistakes: mistakeDetails,
  }
}

// ────────────────────────────────────────
// 依頼カード情報（互換用）
// ────────────────────────────────────────
export const REQUEST_CARD = {
  name: RECIPE_EP01.name,
  compound: RECIPE_EP01.compound,
  hints: [
    '港町で長年保管 → 塩分による塩化物錆を含む',
    '塩化物錆に塩酸（HCl）を使うと錆が悪化する恐れ',
    '高炭素鋼は過熱に敏感 → 高温は避けたい',
    '深部の錆には標準時間の処置が必要',
  ],
}