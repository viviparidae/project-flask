/**
 * recipeEngine.ts — レシピ選択・照合エンジン
 *
 * Coffee Talk / VA-11 Hall-A スタイル:
 * プレイヤーは「試薬・濃度・温度・手順」を選択して実行する。
 * 会話で得た情報を基にレシピを解釈するのがゲームの核心。
 */

// ────────────────────────────────────────
// 選択肢の型
// ────────────────────────────────────────
export type AcidChoice = 'HCl' | 'Citric' | 'Phosphoric'
export type ConcChoice = 'light' | 'standard' | 'strong'
export type TempChoice = 'cold' | 'warm' | 'hot'
export type ProcChoice = 'quick' | 'standard'

export type RecipeAttempt = {
  acid: AcidChoice
  concentration: ConcChoice
  temperature: TempChoice
  procedure: ProcChoice
}

// ────────────────────────────────────────
// レシピ定義
// ────────────────────────────────────────
export type Recipe = {
  id: string
  /** 依頼カード上部のタイトル */
  name: string
  /** 完成物の化学的説明 */
  compound: string
  /** 会話から読み取るべきヒント（プレイヤーへのガイド） */
  hints: string[]
  requiredAcid: AcidChoice
  requiredConcentration: ConcChoice
  requiredTemperature: TempChoice
  requiredProcedure: ProcChoice
  /** 危険な組み合わせ（事故判定） */
  isDangerous: (a: RecipeAttempt) => boolean
}

// ────────────────────────────────────────
// 照合結果
// ────────────────────────────────────────
export type MatchDetail = {
  acid: boolean
  concentration: boolean
  temperature: boolean
  procedure: boolean
}

export type RecipeResult = {
  isAccident: boolean
  matchScore: number   // 0〜4 (正解パラメータ数)
  detail: MatchDetail
  grade: 'PERFECT' | 'GOOD' | 'PARTIAL' | 'FAIL' | 'ACCIDENT'
}

export function matchRecipe(recipe: Recipe, attempt: RecipeAttempt): RecipeResult {
  const isAccident = recipe.isDangerous(attempt)

  if (isAccident) {
    return {
      isAccident: true,
      matchScore: 0,
      detail: { acid: false, concentration: false, temperature: false, procedure: false },
      grade: 'ACCIDENT',
    }
  }

  const detail: MatchDetail = {
    acid:          attempt.acid          === recipe.requiredAcid,
    concentration: attempt.concentration === recipe.requiredConcentration,
    temperature:   attempt.temperature   === recipe.requiredTemperature,
    procedure:     attempt.procedure     === recipe.requiredProcedure,
  }

  const matchScore = Object.values(detail).filter(Boolean).length

  const grade =
    matchScore === 4 ? 'PERFECT'
    : matchScore === 3 ? 'GOOD'
    : matchScore === 2 ? 'PARTIAL'
    : 'FAIL'

  return { isAccident: false, matchScore, detail, grade }
}

// ────────────────────────────────────────
// エピソード1 レシピ定義
// ────────────────────────────────────────
export const RECIPE_EP01: Recipe = {
  id: 'ep01-sword-restoration',
  name: '古剣 腐食除去処置',
  compound: 'リン酸洗浄液（pH 2〜3、温度 35〜45℃）',
  hints: [
    '港町で長年保管 → 塩分による塩化物錆を含む',
    '塩化物錆に塩酸（HCl）を使うと錆が悪化する恐れ',
    '高炭素鋼は過熱に敏感 → 高温は避けたい',
    '深部の錆には標準時間の処置が必要',
  ],
  requiredAcid: 'Phosphoric',
  requiredConcentration: 'standard',
  requiredTemperature: 'warm',
  requiredProcedure: 'standard',
  // 高温（≥85℃）でHCl + 濃め → 塩化水素ガス発生
  isDangerous: (a) => a.acid === 'HCl' && a.concentration === 'strong' && a.temperature === 'hot',
}

export type RecipeBook = {
  episode: string
  recipes: Recipe[]
}

export const RECIPE_BOOK_EP01: RecipeBook = {
  episode: 'ep01',
  recipes: [RECIPE_EP01],
}
export const ACID_LABELS: Record<AcidChoice, { short: string; long: string; note: string }> = {
  HCl:        { short: '塩酸',   long: '塩酸 (HCl)',        note: '強力・速効。塩化物錆には悪作用の危険あり' },
  Citric:     { short: 'クエン酸', long: 'クエン酸',           note: '穏やか・安全。高温・高濃度でないと効果薄' },
  Phosphoric: { short: 'リン酸',  long: 'リン酸 (H₃PO₄)',    note: '塩化物錆に有効。副産物が少なく扱いやすい' },
}

export const CONC_LABELS: Record<ConcChoice, { short: string; note: string }> = {
  light:    { short: '薄め',  note: '安全だが効果が弱い' },
  standard: { short: '標準',  note: 'バランスが良い' },
  strong:   { short: '濃め',  note: '効果は高いが侵食リスクあり' },
}

export const TEMP_LABELS: Record<TempChoice, { short: string; note: string }> = {
  cold: { short: '低温',  note: '反応が遅い。深部の錆に届きにくい' },
  warm: { short: '中温',  note: '適温。反応速度と安全性のバランス良' },
  hot:  { short: '高温',  note: '反応が速いが金属へのダメージ増加' },
}

export const PROC_LABELS: Record<ProcChoice, { short: string; note: string }> = {
  quick:    { short: '短時間処置', note: '表面の錆のみ除去。深部に届かない可能性' },
  standard: { short: '標準処置',  note: '十分な浸透時間。深部の錆まで対処可能' },
}

