import { describe, expect, it, beforeEach } from 'vitest'
import { GameState } from '../src/game/state/GameState'
import { RECIPE_EP01, RECIPE_EP02, RECIPE_EP03, createEmptyAttempt, executeStep, evaluateRecipe } from '../src/lib/recipeEngine'
import { executeTreatment } from '../src/lib/treatmentEngine'
import { createInitialKnowledgeState, autoRecordStageNotes, advanceRoadmapStage, recordAnalysisTag, recordCrafted, recordReaction, type KnowledgeState } from '../src/lib/knowledge'

/** 正解の手順パラメータ（EP01） */
const CORRECT_STEP_PARAMS_EP01: Array<Record<string, string>> = [
  { reagent: 'Phosphoric', concentration: 'standard' },
  { reagent: 'water', concentration: 'adjusted' },
  { temperature: 'warm' },
  { duration: 'standard' },
  { filtration: 'standard' },
]

/** 正解の手順パラメータ（EP02） */
const CORRECT_STEP_PARAMS_EP02: Array<Record<string, string>> = [
  { reagent: 'safflower', concentration: 'extracted' },
  { reagent: 'acetate_buffer', concentration: 'ph4-5' },
  { reagent: 'alum', concentration: 'standard' },
  { temperature: 'warm' },
  { filtration: 'rinse' },
]

/** 正解の手順パラメータ（EP03） */
const CORRECT_STEP_PARAMS_EP03: Array<Record<string, string>> = [
  { reagent: 'waste_acid', concentration: 'measured' },
  { reagent: 'baking_soda', concentration: 'gradual' },
  { duration: 'indicator_check' },
  { duration: 'ph_check' },
]

function createPerfectAttempt(recipe: typeof RECIPE_EP01, correctParams: Array<Record<string, string>>) {
  let attempt = createEmptyAttempt()
  for (const params of correctParams) {
    attempt = executeStep(recipe, attempt, params)
  }
  return attempt
}

function createOneMistakeAttempt(recipe: typeof RECIPE_EP01, correctParams: Array<Record<string, string>>) {
  let attempt = createEmptyAttempt()
  // 最初の手順だけミス
  attempt = executeStep(recipe, attempt, { reagent: 'wrong', concentration: 'wrong' })
  for (let i = 1; i < correctParams.length; i++) {
    attempt = executeStep(recipe, attempt, correctParams[i])
  }
  return attempt
}

function createTwoMistakesAttempt(recipe: typeof RECIPE_EP01, correctParams: Array<Record<string, string>>) {
  let attempt = createEmptyAttempt()
  attempt = executeStep(recipe, attempt, { reagent: 'wrong', concentration: 'wrong' })
  attempt = executeStep(recipe, attempt, { reagent: 'wrong', concentration: 'wrong' })
  for (let i = 2; i < correctParams.length; i++) {
    attempt = executeStep(recipe, attempt, correctParams[i])
  }
  return attempt
}

function createManyMistakesAttempt(recipe: typeof RECIPE_EP01, correctParams: Array<Record<string, string>>) {
  let attempt = createEmptyAttempt()
  for (let i = 0; i < 3; i++) {
    attempt = executeStep(recipe, attempt, { reagent: 'wrong', concentration: 'wrong' })
  }
  for (let i = 3; i < correctParams.length; i++) {
    attempt = executeStep(recipe, attempt, correctParams[i])
  }
  return attempt
}

describe('[Phase 3] GameState — 1日の進行管理', () => {
  it('initializeDay で依頼人キューがセットアップされる', () => {
    const state = new GameState()
    state.initializeDay()
    
    expect(state.currentDay).toBe(2) // 初期値1からインクリメント
    expect(state.clientQueue).toEqual(['ep01', 'ep02', 'ep03'])
    expect(state.completedClients).toEqual([])
    expect(state.isDayEnd).toBe(false)
    expect(state.currentEpisode).toBe('ep01')
  })

  it('getCurrentClient で現在の依頼人が取得できる', () => {
    const state = new GameState()
    state.clientQueue = ['ep01', 'ep02', 'ep03']
    
    expect(state.getCurrentClient()).toBe('ep01')
    
    state.clientQueue = ['ep02', 'ep03']
    expect(state.getCurrentClient()).toBe('ep02')
    
    state.clientQueue = []
    expect(state.getCurrentClient()).toBeNull()
  })

  it('completeClient で依頼人完了処理が正しく動作する', () => {
    const state = new GameState()
    state.clientQueue = ['ep01', 'ep02', 'ep03']
    state.trust = 50
    state.gold = 80
    
    // 1人目の完了
    state.completeClient('ep01', 'PERFECT', 35, 280)
    
    expect(state.trust).toBe(85)
    expect(state.gold).toBe(360)
    expect(state.completedClients).toEqual(['ep01'])
    expect(state.clientQueue).toEqual(['ep02', 'ep03'])
    expect(state.currentEpisode).toBe('ep02')
    expect(state.ep01Completed).toBe(true)
    expect(state.ep01Result).toBe('PERFECT')
    expect(state.isDayEnd).toBe(false)
  })

  it('3人完了で isDayEnd が true になる', () => {
    const state = new GameState()
    state.clientQueue = ['ep01', 'ep02', 'ep03']
    state.trust = 50
    state.gold = 80
    
    state.completeClient('ep01', 'PERFECT', 35, 280)
    expect(state.isDayEnd).toBe(false)
    
    state.completeClient('ep02', 'GOOD', 12, 120)
    expect(state.isDayEnd).toBe(false)
    
    state.completeClient('ep03', 'GOOD', 8, 60)
    expect(state.isDayEnd).toBe(true)
    expect(state.completedClients).toEqual(['ep01', 'ep02', 'ep03'])
    expect(state.clientQueue).toEqual([])
  })

  it('completeDayEnd で日の終わりフラグがリセットされる', () => {
    const state = new GameState()
    state.isDayEnd = true
    state.completeDayEnd()
    expect(state.isDayEnd).toBe(false)
  })

  it('評判は 0〜100 にクランプされる', () => {
    const state = new GameState()
    state.trust = 90
    state.completeClient('ep01', 'PERFECT', 35, 280) // 90 + 35 = 125 → 100
    expect(state.trust).toBe(100)
    
    const state2 = new GameState()
    state2.trust = 10
    state2.completeClient('ep01', 'DAMAGED', -30, 0) // 10 - 30 = -20 → 0
    expect(state2.trust).toBe(0)
  })
})

describe('[Phase 3] EP02/EP03 レシピエンジン — 品質評価', () => {
  it('EP02: 全手順正解で perfect 品質になる', () => {
    const attempt = createPerfectAttempt(RECIPE_EP02, CORRECT_STEP_PARAMS_EP02)
    const result = evaluateRecipe(RECIPE_EP02, attempt)
    
    expect(result.isComplete).toBe(true)
    expect(result.qualityTier).toBe('perfect')
    expect(result.progress.completed).toBe(5)
    expect(result.mistakes).toHaveLength(0)
  })

  it('EP02: 1手順ミスで good 品質になる', () => {
    const attempt = createOneMistakeAttempt(RECIPE_EP02, CORRECT_STEP_PARAMS_EP02)
    const result = evaluateRecipe(RECIPE_EP02, attempt)
    
    expect(result.isComplete).toBe(true)
    expect(result.qualityTier).toBe('good')
    expect(result.mistakes).toHaveLength(1)
  })

  it('EP02: 2手順ミスで partial 品質になる', () => {
    const attempt = createTwoMistakesAttempt(RECIPE_EP02, CORRECT_STEP_PARAMS_EP02)
    const result = evaluateRecipe(RECIPE_EP02, attempt)
    
    expect(result.isComplete).toBe(true)
    expect(result.qualityTier).toBe('partial')
    expect(result.mistakes).toHaveLength(2)
  })

  it('EP02: 多数ミスで failed 品質になる', () => {
    const attempt = createManyMistakesAttempt(RECIPE_EP02, CORRECT_STEP_PARAMS_EP02)
    const result = evaluateRecipe(RECIPE_EP02, attempt)
    
    expect(result.isComplete).toBe(true)
    expect(result.qualityTier).toBe('failed')
    expect(result.mistakes.length).toBeGreaterThanOrEqual(3)
  })

  it('EP03: 全手順正解で perfect 品質になる', () => {
    const attempt = createPerfectAttempt(RECIPE_EP03, CORRECT_STEP_PARAMS_EP03)
    const result = evaluateRecipe(RECIPE_EP03, attempt)
    
    expect(result.isComplete).toBe(true)
    expect(result.qualityTier).toBe('perfect')
    expect(result.progress.completed).toBe(4)
    expect(result.mistakes).toHaveLength(0)
  })

  it('EP03: 1手順ミスで good 品質になる', () => {
    const attempt = createOneMistakeAttempt(RECIPE_EP03, CORRECT_STEP_PARAMS_EP03)
    const result = evaluateRecipe(RECIPE_EP03, attempt)
    
    expect(result.isComplete).toBe(true)
    expect(result.qualityTier).toBe('good')
    expect(result.mistakes).toHaveLength(1)
  })

  it('EP03: 2手順ミスで partial 品質になる', () => {
    const attempt = createTwoMistakesAttempt(RECIPE_EP03, CORRECT_STEP_PARAMS_EP03)
    const result = evaluateRecipe(RECIPE_EP03, attempt)
    
    expect(result.isComplete).toBe(true)
    expect(result.qualityTier).toBe('partial')
    expect(result.mistakes).toHaveLength(2)
  })

  it('EP03: 多数ミスで failed 品質になる', () => {
    const attempt = createManyMistakesAttempt(RECIPE_EP03, CORRECT_STEP_PARAMS_EP03)
    const result = evaluateRecipe(RECIPE_EP03, attempt)
    
    expect(result.isComplete).toBe(true)
    expect(result.qualityTier).toBe('failed')
    expect(result.mistakes.length).toBeGreaterThanOrEqual(3)
  })
})

describe('[Phase 3] EP02/EP03 統合実行 — executeTreatment', () => {
  it('EP02: 完全修復で PERFECT 判定になる（fateEngineは共通のためEP01と同じ値）', () => {
    const attempt = createPerfectAttempt(RECIPE_EP02, CORRECT_STEP_PARAMS_EP02)
    const { recipeResult, fate } = executeTreatment(attempt, RECIPE_EP02)
    
    expect(recipeResult.qualityTier).toBe('perfect')
    expect(fate.grade).toBe('PERFECT')
    // fateEngineは共通なのでEP01と同じ値（エピソード別の値はDialogueSceneで適用）
    expect(fate.trustDelta).toBe(35)
    expect(fate.reward).toBe(280)
  })

  it('EP03: 完全修復で PERFECT 判定になる（fateEngineは共通のためEP01と同じ値）', () => {
    const attempt = createPerfectAttempt(RECIPE_EP03, CORRECT_STEP_PARAMS_EP03)
    const { recipeResult, fate } = executeTreatment(attempt, RECIPE_EP03)
    
    expect(recipeResult.qualityTier).toBe('perfect')
    expect(fate.grade).toBe('PERFECT')
    // fateEngineは共通なのでEP01と同じ値
    expect(fate.trustDelta).toBe(35)
    expect(fate.reward).toBe(280)
  })

  it('EP02: 全グレード（PERFECT/GOOD/PARTIAL/DAMAGED）に到達できる', () => {
    const grades = new Set<string>()
    grades.add(executeTreatment(createPerfectAttempt(RECIPE_EP02, CORRECT_STEP_PARAMS_EP02), RECIPE_EP02).fate.grade)
    grades.add(executeTreatment(createOneMistakeAttempt(RECIPE_EP02, CORRECT_STEP_PARAMS_EP02), RECIPE_EP02).fate.grade)
    grades.add(executeTreatment(createTwoMistakesAttempt(RECIPE_EP02, CORRECT_STEP_PARAMS_EP02), RECIPE_EP02).fate.grade)
    grades.add(executeTreatment(createManyMistakesAttempt(RECIPE_EP02, CORRECT_STEP_PARAMS_EP02), RECIPE_EP02).fate.grade)
    
    expect(grades).toEqual(new Set(['PERFECT', 'GOOD', 'PARTIAL', 'DAMAGED']))
  })

  it('EP03: 全グレード（PERFECT/GOOD/PARTIAL/DAMAGED）に到達できる', () => {
    const grades = new Set<string>()
    grades.add(executeTreatment(createPerfectAttempt(RECIPE_EP03, CORRECT_STEP_PARAMS_EP03), RECIPE_EP03).fate.grade)
    grades.add(executeTreatment(createOneMistakeAttempt(RECIPE_EP03, CORRECT_STEP_PARAMS_EP03), RECIPE_EP03).fate.grade)
    grades.add(executeTreatment(createTwoMistakesAttempt(RECIPE_EP03, CORRECT_STEP_PARAMS_EP03), RECIPE_EP03).fate.grade)
    grades.add(executeTreatment(createManyMistakesAttempt(RECIPE_EP03, CORRECT_STEP_PARAMS_EP03), RECIPE_EP03).fate.grade)
    
    expect(grades).toEqual(new Set(['PERFECT', 'GOOD', 'PARTIAL', 'DAMAGED']))
  })
})

describe('[Phase 3] 知識ノート — 1日の記録とロードマップ進行', () => {
  let state: KnowledgeState
  
  beforeEach(() => {
    state = createInitialKnowledgeState()
  })
  
  it('1日分（3依頼人）の記録が残る', () => {
    // EP01 完了
    autoRecordStageNotes(state, 1)
    recordCrafted(state, { episodeId: 'ep01', recipeId: 'ep01-recipe', recipeName: '古剣 腐食除去処置', qualityTier: 'perfect' })
    recordReaction(state, { episodeId: 'ep01', clientName: 'ガルド', outcomeGrade: 'PERFECT', summary: '親父の顔が刃に映っている。' })
    recordAnalysisTag(state, { episodeId: 'ep01', label: '黒錆', description: '表面の黒い層' })
    recordAnalysisTag(state, { episodeId: 'ep01', label: '塩化物錆', description: '白灰色の錆' })
    
    // EP02 完了
    recordCrafted(state, { episodeId: 'ep02', recipeId: 'ep02-recipe', recipeName: '植物染料 媒染定着処理', qualityTier: 'good' })
    recordReaction(state, { episodeId: 'ep02', clientName: 'ナーラ', outcomeGrade: 'GOOD', summary: 'だいぶ良くなりました。' })
    recordAnalysisTag(state, { episodeId: 'ep02', label: '植物色素', description: 'ベニバナの赤色素' })
    recordAnalysisTag(state, { episodeId: 'ep02', label: '媒染剤', description: '明礬（アルミニウム）' })
    
    // EP03 完了
    recordCrafted(state, { episodeId: 'ep03', recipeId: 'ep03-recipe', recipeName: '廃酸 中和処理', qualityTier: 'perfect' })
    recordReaction(state, { episodeId: 'ep03', clientName: '旅の商人', outcomeGrade: 'PERFECT', summary: '完璧だ。pH 7.0 ちょうど。' })
    recordAnalysisTag(state, { episodeId: 'ep03', label: '酸塩基中和', description: '重曹による中和' })
    recordAnalysisTag(state, { episodeId: 'ep03', label: '指示薬', description: 'フェノールフタレイン' })
    
    // 検証
    expect(state.crafted).toHaveLength(3)
    expect(state.reactions).toHaveLength(3)
    expect(state.analysisTags).toHaveLength(6) // 2+2+2
    
    // 品質段階の確認
    expect(state.crafted[0].qualityTier).toBe('perfect')
    expect(state.crafted[1].qualityTier).toBe('good')
    expect(state.crafted[2].qualityTier).toBe('perfect')
    
    // 依頼人名の確認
    expect(state.reactions[0].clientName).toBe('ガルド')
    expect(state.reactions[1].clientName).toBe('ナーラ')
    expect(state.reactions[2].clientName).toBe('旅の商人')
  })
  
  it('ロードマップ段階が進む', () => {
    expect(state.currentRoadmapStage).toBe(0)
    
    advanceRoadmapStage(state, 1)
    expect(state.currentRoadmapStage).toBe(1)
    
    advanceRoadmapStage(state, 2)
    expect(state.currentRoadmapStage).toBe(2)
    
    // 戻れない
    expect(advanceRoadmapStage(state, 1)).toBe(false)
    expect(state.currentRoadmapStage).toBe(2)
  })
})

describe('[Phase 3] 1日通しプレイ — 3依頼人＋振り返りの到達可能性', () => {
  it('EP01/EP02/EP03 全てで3種の結末（PERFECT/GOOD/PARTIAL）に到達できる', () => {
    // DAMAGEDは「レシピの注意書きを無視したときの反応差分」として残すが、
    // 正しくレシピ通り作れば DAMAGED にはならない
    // ここでは PERFECT/GOOD/PARTIAL の3種が到達可能なことを確認
    
    const ep01Grades = new Set<string>()
    ep01Grades.add(executeTreatment(createPerfectAttempt(RECIPE_EP01, CORRECT_STEP_PARAMS_EP01), RECIPE_EP01).fate.grade)
    ep01Grades.add(executeTreatment(createOneMistakeAttempt(RECIPE_EP01, CORRECT_STEP_PARAMS_EP01), RECIPE_EP01).fate.grade)
    ep01Grades.add(executeTreatment(createTwoMistakesAttempt(RECIPE_EP01, CORRECT_STEP_PARAMS_EP01), RECIPE_EP01).fate.grade)
    // 3種以上の到達を確認（DAMAGED含む場合もある）
    expect(ep01Grades.size).toBeGreaterThanOrEqual(3)
    expect(ep01Grades.has('PERFECT')).toBe(true)
    expect(ep01Grades.has('GOOD')).toBe(true)
    expect(ep01Grades.has('PARTIAL')).toBe(true)
    
    const ep02Grades = new Set<string>()
    ep02Grades.add(executeTreatment(createPerfectAttempt(RECIPE_EP02, CORRECT_STEP_PARAMS_EP02), RECIPE_EP02).fate.grade)
    ep02Grades.add(executeTreatment(createOneMistakeAttempt(RECIPE_EP02, CORRECT_STEP_PARAMS_EP02), RECIPE_EP02).fate.grade)
    ep02Grades.add(executeTreatment(createTwoMistakesAttempt(RECIPE_EP02, CORRECT_STEP_PARAMS_EP02), RECIPE_EP02).fate.grade)
    expect(ep02Grades.has('PERFECT')).toBe(true)
    expect(ep02Grades.has('GOOD')).toBe(true)
    expect(ep02Grades.has('PARTIAL')).toBe(true)
    
    const ep03Grades = new Set<string>()
    ep03Grades.add(executeTreatment(createPerfectAttempt(RECIPE_EP03, CORRECT_STEP_PARAMS_EP03), RECIPE_EP03).fate.grade)
    ep03Grades.add(executeTreatment(createOneMistakeAttempt(RECIPE_EP03, CORRECT_STEP_PARAMS_EP03), RECIPE_EP03).fate.grade)
    ep03Grades.add(executeTreatment(createTwoMistakesAttempt(RECIPE_EP03, CORRECT_STEP_PARAMS_EP03), RECIPE_EP03).fate.grade)
    expect(ep03Grades.has('PERFECT')).toBe(true)
    expect(ep03Grades.has('GOOD')).toBe(true)
    expect(ep03Grades.has('PARTIAL')).toBe(true)
  })
  
  it('GameState で 1日分の完了フローが動作する', () => {
    const state = new GameState()
    state.initializeDay()
    
    // 1人目: EP01 PERFECT
    state.completeClient('ep01', 'PERFECT', 35, 280)
    expect(state.currentEpisode).toBe('ep02')
    expect(state.completedClients).toEqual(['ep01'])
    
    // 2人目: EP02 GOOD
    state.completeClient('ep02', 'GOOD', 12, 120)
    expect(state.currentEpisode).toBe('ep03')
    expect(state.completedClients).toEqual(['ep01', 'ep02'])
    
    // 3人目: EP03 PARTIAL
    state.completeClient('ep03', 'PARTIAL', 1, 20)
    expect(state.isDayEnd).toBe(true)
    expect(state.completedClients).toEqual(['ep01', 'ep02', 'ep03'])
    
    // 振り返り完了
    state.completeDayEnd()
    expect(state.isDayEnd).toBe(false)
    
    // 評価値の確認
    expect(state.trust).toBe(50 + 35 + 12 + 1) // 98
    expect(state.gold).toBe(80 + 280 + 120 + 20) // 500
  })
})