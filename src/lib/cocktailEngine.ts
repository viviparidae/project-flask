/**
 * cocktailEngine.ts — VA-11 Hall-A スタイル カクテルレシピエンジン
 *
 * 基底酒 5種 + 添加物でカクテルを構成。
 * レシピは会話から推測させるため UI には出さない（隠しパラメータ）。
 */

// ────────────────────────────────────────
// 材料定義
// ────────────────────────────────────────
export type BaseSpirit =
  | 'adelhyde'   // アデルハイト — 甘口・低アルコール
  | 'brandy'     // ブランデー — 濃厚・高アルコール
  | 'powderK'    // パウダーK — 中性・調整用
  | 'flanergide' // フラネルギド — 酸味・フルーティ
  | 'karmotrine' // カーモトリン — 高アルコール・苦味

export type Additive =
  | 'ice'        // 氷 — 冷却・薄める
  | 'syrup'      // シロップ — 甘味増強
  | 'bitters'    // ビタース — 香り・複雑味
  | 'soda'       // ソーダ — 炭酸・軽やか
  | 'energy'     // エナジー — アルコールブースト

export type Ingredient = BaseSpirit | Additive

// 材料メタデータ
export const INGREDIENT_META: Record<Ingredient, {
  name: string
  short: string
  color: string        // 液体色（HEX）
  category: 'base' | 'additive'
  abv: number          // アルコール度数寄与（0〜100）
  sweetness: number    // 甘味寄与（-100〜100）
  sourness: number     // 酸味寄与（-100〜100）
  bitterness: number   // 苦味寄与（-100〜100）
  volume: number       // 体積寄与（ml）
}> = {
  // 基底酒
  adelhyde:   { name: 'アデルハイト',    short: 'アデル',    color: '#ff6b9d', category: 'base', abv: 15, sweetness: 60, sourness: 10, bitterness: 5,  volume: 30 },
  brandy:     { name: 'ブランデー',      short: 'ブラン',    color: '#8b4513', category: 'base', abv: 40, sweetness: 20, sourness: 5,  bitterness: 15, volume: 30 },
  powderK:    { name: 'パウダーK',       short: 'パウダー',   color: '#e8e8e8', category: 'base', abv: 5,  sweetness: 0,  sourness: 0,  bitterness: 0,  volume: 30 },
  flanergide: { name: 'フラネルギド',    short: 'フラネル',   color: '#ffd700', category: 'base', abv: 20, sweetness: 30, sourness: 50, bitterness: 5,  volume: 30 },
  karmotrine: { name: 'カーモトリン',    short: 'カーモ',     color: '#4a006e', category: 'base', abv: 60, sweetness: -20, sourness: 10, bitterness: 50, volume: 30 },

  // 添加物
  ice:       { name: '氷',         short: '氷',       color: '#a0d0ff', category: 'additive', abv: -10, sweetness: 0,   sourness: 0,   bitterness: 0,   volume: 20 },
  syrup:     { name: 'シロップ',   short: 'シロップ', color: '#ffb6c1', category: 'additive', abv: 0,   sweetness: 50,  sourness: 0,   bitterness: -10, volume: 15 },
  bitters:   { name: 'ビタース',   short: 'ビター',   color: '#2d1b0e', category: 'additive', abv: 5,   sweetness: -10, sourness: 5,   bitterness: 40,  volume: 5  },
  soda:      { name: 'ソーダ',     short: 'ソーダ',   color: '#e0f0ff', category: 'additive', abv: -5,  sweetness: 10,  sourness: 5,   bitterness: -5,  volume: 25 },
  energy:    { name: 'エナジー',   short: 'エナジ',   color: '#00ff88', category: 'additive', abv: 15,  sweetness: 20,  sourness: 15,  bitterness: 10,  volume: 15 },
}

// ────────────────────────────────────────
// シェイカー状態
// ────────────────────────────────────────
export type ShakerState = {
  ingredients: Ingredient[]           // 投入順序保持
  baseCounts: Record<BaseSpirit, number>
  additiveCounts: Record<Additive, number>
  mixed: boolean                      // ミックス実行済み
  aged: boolean                       // エイジ実行済み
  mixCount: number                    // ミックス回数
  ageTime: number                     // 熟成時間（秒）
}

export function createEmptyShaker(): ShakerState {
  return {
    ingredients: [],
    baseCounts: { adelhyde: 0, brandy: 0, powderK: 0, flanergide: 0, karmotrine: 0 },
    additiveCounts: { ice: 0, syrup: 0, bitters: 0, soda: 0, energy: 0 },
    mixed: false,
    aged: false,
    mixCount: 0,
    ageTime: 0,
  }
}

export function addIngredient(shaker: ShakerState, ingredient: Ingredient): ShakerState {
  const next = { ...shaker, ingredients: [...shaker.ingredients, ingredient] }
  if (INGREDIENT_META[ingredient].category === 'base') {
    next.baseCounts[ingredient as BaseSpirit]++
  } else {
    next.additiveCounts[ingredient as Additive]++
  }
  return next
}

export function clearShaker(shaker: ShakerState): ShakerState {
  return createEmptyShaker()
}

export function doMix(shaker: ShakerState): ShakerState {
  return { ...shaker, mixed: true, mixCount: shaker.mixCount + 1 }
}

export function doAge(shaker: ShakerState, seconds: number = 10): ShakerState {
  return { ...shaker, aged: true, ageTime: shaker.ageTime + seconds }
}

// ────────────────────────────────────────
// レシピ定義（隠しデータ）
// ────────────────────────────────────────
export type CocktailRecipe = {
  id: string
  name: string
  description: string
  // 必須基底酒（種類と最小量）
  requiredBase: Partial<Record<BaseSpirit, number>>
  // 許容添加物（最大量制限）
  allowedAdditives: Partial<Record<Additive, number>>
  // 手順制約
  mustMix: boolean
  mustAge: boolean
  forbidMixAfterAge: boolean
  // 目標味覚プロファイル（0〜100）
  targetProfile: {
    abv: [number, number]        // アルコール度数レンジ
    sweetness: [number, number]
    sourness: [number, number]
    bitterness: [number, number]
    volume: [number, number]     // 総量 ml
  }
  // 判定閾値
  perfectThreshold: number  // 0〜1
  goodThreshold: number
}

// エピソード1 カクテルレシピ（会話から推測）
export const COCKTAIL_RECIPES_EP01: CocktailRecipe[] = [
  {
    id: 'sweet_strong',
    name: '甘くて強いの',
    description: 'アデルハイト基調、エナジーで度数上げ、エイジで馴染ませる',
    requiredBase: { adelhyde: 2 },
    allowedAdditives: { energy: 1, ice: 2 },
    mustMix: true,
    mustAge: true,
    forbidMixAfterAge: false,
    targetProfile: {
      abv: [35, 50],
      sweetness: [50, 80],
      sourness: [0, 20],
      bitterness: [0, 15],
      volume: [120, 180],
    },
    perfectThreshold: 0.9,
    goodThreshold: 0.7,
  },
  {
    id: 'non_alcoholic',
    name: 'ノンアルで',
    description: 'パウダーK基調、ソーダとシロップで仕上げ、ミックスのみ',
    requiredBase: { powderK: 2 },
    allowedAdditives: { soda: 1, syrup: 1, ice: 1 },
    mustMix: true,
    mustAge: false,
    forbidMixAfterAge: true,
    targetProfile: {
      abv: [0, 5],
      sweetness: [30, 60],
      sourness: [10, 30],
      bitterness: [0, 10],
      volume: [100, 150],
    },
    perfectThreshold: 0.85,
    goodThreshold: 0.65,
  },
  {
    id: 'bitter_classic',
    name: 'ビターなクラシック',
    description: 'ブランデー基調、ビタースと氷、ミックスしてエイジ',
    requiredBase: { brandy: 2 },
    allowedAdditives: { bitters: 1, ice: 2, syrup: 1 },
    mustMix: true,
    mustAge: true,
    forbidMixAfterAge: false,
    targetProfile: {
      abv: [30, 45],
      sweetness: [10, 30],
      sourness: [5, 20],
      bitterness: [25, 50],
      volume: [110, 160],
    },
    perfectThreshold: 0.88,
    goodThreshold: 0.7,
  },
  {
    id: 'fruity_refresh',
    name: 'フルーティなリフレッシュ',
    description: 'フラネルギド基調、ソーダと氷、ミックスのみ',
    requiredBase: { flanergide: 2 },
    allowedAdditives: { soda: 1, ice: 2, syrup: 1 },
    mustMix: true,
    mustAge: false,
    forbidMixAfterAge: true,
    targetProfile: {
      abv: [15, 25],
      sweetness: [30, 50],
      sourness: [40, 70],
      bitterness: [0, 10],
      volume: [120, 170],
    },
    perfectThreshold: 0.85,
    goodThreshold: 0.65,
  },
]

// ────────────────────────────────────────
// 味覚プロファイル計算
// ────────────────────────────────────────
export type FlavorProfile = {
  abv: number
  sweetness: number
  sourness: number
  bitterness: number
  volume: number
  color: string
}

export function calculateProfile(shaker: ShakerState): FlavorProfile {
  let abv = 0, sweetness = 0, sourness = 0, bitterness = 0, volume = 0
  let colorR = 0, colorG = 0, colorB = 0, colorWeight = 0

  // 基底酒
  for (const [base, count] of Object.entries(shaker.baseCounts)) {
    if (count === 0) continue
    const meta = INGREDIENT_META[base as BaseSpirit]
    const mult = count
    abv += meta.abv * mult
    sweetness += meta.sweetness * mult
    sourness += meta.sourness * mult
    bitterness += meta.bitterness * mult
    volume += meta.volume * mult
    const hex = meta.color.replace('#', '')
    colorR += parseInt(hex.slice(0,2), 16) * mult
    colorG += parseInt(hex.slice(2,4), 16) * mult
    colorB += parseInt(hex.slice(4,6), 16) * mult
    colorWeight += mult
  }

  // 添加物
  for (const [add, count] of Object.entries(shaker.additiveCounts)) {
    if (count === 0) continue
    const meta = INGREDIENT_META[add as Additive]
    const mult = count
    abv += meta.abv * mult
    sweetness += meta.sweetness * mult
    sourness += meta.sourness * mult
    bitterness += meta.bitterness * mult
    volume += meta.volume * mult
    const hex = meta.color.replace('#', '')
    colorR += parseInt(hex.slice(0,2), 16) * mult
    colorG += parseInt(hex.slice(2,4), 16) * mult
    colorB += parseInt(hex.slice(4,6), 16) * mult
    colorWeight += mult
  }

  // ミックス・エイジによる補正
  if (shaker.mixed) {
    // ミックスで味が馴染む（極端な値が緩和）
    sweetness *= 0.95
    sourness *= 0.95
    bitterness *= 0.95
    // 色が均一化
  }
  if (shaker.aged) {
    // 熟成でアルコール角が取れ、苦味増、甘味減
    abv *= 0.9
    sweetness *= 0.85
    bitterness *= 1.15
    // 色が深まる
    colorR = Math.min(255, colorR * 1.1)
    colorG = Math.min(255, colorG * 1.1)
    colorB = Math.min(255, colorB * 1.1)
  }

  const finalColor = colorWeight > 0
    ? '#' + [colorR, colorG, colorB].map(v => Math.round(v / colorWeight).toString(16).padStart(2, '0')).join('')
    : '#1a1a2e'

  return {
    abv: Math.round(abv),
    sweetness: Math.round(sweetness),
    sourness: Math.round(sourness),
    bitterness: Math.round(bitterness),
    volume: Math.round(volume),
    color: finalColor,
  }
}

// ────────────────────────────────────────
// 照合判定
// ────────────────────────────────────────
export type MatchResult = {
  recipe: CocktailRecipe | null
  grade: 'PERFECT' | 'GOOD' | 'FAIL'
  score: number        // 0〜1
  details: {
    baseMatch: boolean
    additiveMatch: boolean
    procedureMatch: boolean
    profileMatch: number  // 0〜1
  }
  feedback: string
}

function profileDistance(profile: FlavorProfile, target: CocktailRecipe['targetProfile']): number {
  let total = 0, matched = 0
  const check = (val: number, [min, max]: [number, number]) => {
    if (val >= min && val <= max) return 1
    const center = (min + max) / 2
    const range = (max - min) / 2 || 1
    return Math.max(0, 1 - Math.abs(val - center) / (range * 2))
  }
  total += 1; matched += check(profile.abv, target.abv)
  total += 1; matched += check(profile.sweetness, target.sweetness)
  total += 1; matched += check(profile.sourness, target.sourness)
  total += 1; matched += check(profile.bitterness, target.bitterness)
  total += 1; matched += check(profile.volume, target.volume)
  return matched / total
}

export function matchCocktail(shaker: ShakerState, recipes: CocktailRecipe[]): MatchResult {
  const profile = calculateProfile(shaker)

  // 該当レシピ探索（基底酒構成で絞り込み）
  let bestRecipe: CocktailRecipe | null = null
  let bestScore = 0
  let bestDetails = { baseMatch: false, additiveMatch: false, procedureMatch: false, profileMatch: 0 }

  for (const recipe of recipes) {
    // 基底酒チェック
    let baseOk = true
    for (const [base, minCount] of Object.entries(recipe.requiredBase)) {
      if (shaker.baseCounts[base as BaseSpirit] < minCount) { baseOk = false; break }
    }
    if (!baseOk) continue

    // 添加物チェック（許容外が含まれていれば減点）
    let additiveOk = true
    for (const [add, count] of Object.entries(shaker.additiveCounts)) {
      if (count > 0 && !(add in recipe.allowedAdditives)) { additiveOk = false; break }
      const maxAllowed = recipe.allowedAdditives[add as Additive] ?? 0
      if (count > maxAllowed) { additiveOk = false; break }
    }

    // 手順チェック
    let procedureOk = true
    if (recipe.mustMix && !shaker.mixed) procedureOk = false
    if (recipe.mustAge && !shaker.aged) procedureOk = false
    if (recipe.forbidMixAfterAge && shaker.mixed && shaker.aged && shaker.mixCount > 0) {
      // ミックス→エイジ→ミックスの順序は許容、エイジ→ミックスは禁止
      // 簡易判定：mixed && aged で mixCount > 0 ならミックスが後にある
      // 実際は順序追跡が必要だが簡略化
    }

    const profileMatch = profileDistance(profile, recipe.targetProfile)
    const score = (baseOk ? 0.3 : 0) + (additiveOk ? 0.2 : 0) + (procedureOk ? 0.2 : 0) + (profileMatch * 0.3)

    if (score > bestScore) {
      bestScore = score
      bestRecipe = recipe
      bestDetails = { baseMatch: baseOk, additiveMatch: additiveOk, procedureMatch: procedureOk, profileMatch }
    }
  }

  if (!bestRecipe) {
    return {
      recipe: null,
      grade: 'FAIL',
      score: 0,
      details: { baseMatch: false, additiveMatch: false, procedureMatch: false, profileMatch: 0 },
      feedback: '……何これ。注文と全然違う。',
    }
  }

  let grade: 'PERFECT' | 'GOOD' | 'FAIL'
  if (bestScore >= bestRecipe.perfectThreshold) grade = 'PERFECT'
  else if (bestScore >= bestRecipe.goodThreshold) grade = 'GOOD'
  else grade = 'FAIL'

  const feedbacks: Record<'PERFECT'|'GOOD'|'FAIL', string> = {
    PERFECT: '完璧だ。まさに注文通り……いや、期待以上だ。',
    GOOD: '悪くない。まあ、及第点ってところか。',
    FAIL: '……これはないな。作り直してくれ。',
  }

  return {
    recipe: bestRecipe,
    grade,
    score: bestScore,
    details: bestDetails,
    feedback: feedbacks[grade],
  }
}

// ────────────────────────────────────────
// 客の注文ヒント（会話から取得）
// ────────────────────────────────────────
export type CustomerOrder = {
  customerId: string
  customerName: string
  hintText: string          // 「甘くて強いの」「ノンアルで」等
  hiddenRecipeId: string    // 実際のレシピID
}

export const EP01_ORDERS: CustomerOrder[] = [
  { customerId: 'gard', customerName: 'ガルド', hintText: '「甘くて強いのを頼む。アルコールきいてなきゃ意味がない」', hiddenRecipeId: 'sweet_strong' },
  // 他の客はエピソード進行で追加
]