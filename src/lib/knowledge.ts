/**
 * knowledge.ts — 知識ノート（Field Notes）+ ロードマップ
 *
 * プレイヤーが「作ったもの・聞いた話」として化学概念が自動で蓄積される。
 * 主人公の手帳という体裁で、ゲーム内いつでも参照できる。
 * ロードマップ表示（現在の段階と、次に届く段階の予告）を同一画面内の一区画として兼ねる。
 */

export type KnowledgeNote = {
  id: string
  /** 作中表現（最初に表示される言葉） */
  worldTerm: string
  /** 平易な説明 */
  plainText: string
  /** 化学名（レシピ解説で併記される） */
  chemTerm?: string
  /** 化学的な補足 */
  chemText?: string
  /** 記録された経路 */
  source: 'recipe' | 'dialogue' | 'observation' | 'reaction'
  /** 記録エピソード */
  learnedAt: string
  /** 関連ノートID */
  relatedNotes: string[]
  /** どのロードマップ段階で開放されるか（0=開始時、1=第1段、...） */
  roadmapStage: number
}

/** 作成した品目の記録 */
export type CraftedRecord = {
  id: string
  episodeId: string
  recipeId: string
  recipeName: string
  qualityTier: 'perfect' | 'good' | 'partial' | 'failed'
  timestamp: number
}

/** 分析タグ（観察で得た着目点） */
export type AnalysisTag = {
  id: string
  episodeId: string
  label: string
  description: string
  timestamp: number
}

/** 依頼人の反応記録 */
export type ReactionRecord = {
  id: string
  episodeId: string
  clientName: string
  outcomeGrade: 'PERFECT' | 'GOOD' | 'PARTIAL' | 'DAMAGED'
  summary: string
  timestamp: number
}

/** ロードマップ段階定義 */
export type RoadmapStage = {
  stage: number
  title: string
  description: string
  /** この段階で開く道具・素材・知識 */
  unlocks: {
    tools: string[]
    materials: string[]
    knowledge: string[]
  }
  /** 解ける問題の範囲 */
  scope: string
  /** 次の段階の予告（詳細は未開示） */
  nextPreview?: {
    stage: number
    title: string
    hint: string
  }
}

/** EP01「古剣の腐食」で自動記録されるノート */
export const EP01_NOTES: KnowledgeNote[] = [
  {
    id: 'rust',
    worldTerm: '錆',
    plainText: '金属が空気と水に食われた跡。放っておくと広がる',
    chemTerm: '酸化（腐食）',
    chemText: '鉄が酸素や水と結びついて性質が変わる現象',
    source: 'observation',
    learnedAt: 'ep01',
    relatedNotes: ['black-rust', 'chloride-rust'],
    roadmapStage: 1,
  },
  {
    id: 'black-rust',
    worldTerm: '黒錆',
    plainText: '表面を覆う黒い錆の層。硬く、刃全体を包んでいる',
    chemTerm: 'Fe₃O₄',
    chemText: '四酸化三鉄。磁鉄鉱と同じ組成の酸化物',
    source: 'recipe',
    learnedAt: 'ep01',
    relatedNotes: ['rust'],
    roadmapStage: 1,
  },
  {
    id: 'chloride-rust',
    worldTerm: '白っぽい錆',
    plainText: '海の塩が運んだ白灰色の錆。普通の錆より性質が悪く、放っておくと食い進む',
    chemTerm: '塩化物錆',
    chemText: 'FeCl₂ など塩化物を含む腐食生成物。塩酸を使うと悪化する',
    source: 'dialogue',
    learnedAt: 'ep01',
    relatedNotes: ['rust', 'acid-phosphoric'],
    roadmapStage: 1,
  },
  {
    id: 'acid-phosphoric',
    worldTerm: '穏やかな酸',
    plainText: '錆を溶かすが金属を傷めにくい酸。刃物の洗浄に向く',
    chemTerm: 'リン酸（H₃PO₄）',
    chemText: '金属酸化物を選択的に溶解し、母材の鉄を攻撃しにくい弱酸',
    source: 'recipe',
    learnedAt: 'ep01',
    relatedNotes: ['chloride-rust', 'concentration-care'],
    roadmapStage: 1,
  },
  {
    id: 'acid-hydrochloric',
    worldTerm: '荒い酸',
    plainText: 'よく溶かすが金属まで攻撃し、熱で有毒ガスも出す',
    chemTerm: '塩酸（HCl）',
    chemText: '強酸。塩化物錆を悪化させ、高温で塩素ガスを発生させる危険がある',
    source: 'reaction',
    learnedAt: 'ep01',
    relatedNotes: ['chloride-rust', 'heat-care'],
    roadmapStage: 1,
  },
  {
    id: 'concentration-care',
    worldTerm: '濃さの加減',
    plainText: '濃いほど強力だが、相手まで傷める。薄すぎれば届かない',
    chemTerm: '濃度の概念',
    chemText: '処置液の濃さ。錆の除去と金属の侵食のバランスを決める',
    source: 'recipe',
    learnedAt: 'ep01',
    relatedNotes: ['acid-phosphoric', 'heat-care'],
    roadmapStage: 1,
  },
  {
    id: 'heat-care',
    worldTerm: '熱の加減',
    plainText: '熱は反応を速めるが、暴走と副産物も招く',
    chemTerm: '温度依存性・副反応',
    chemText: '高温は反応速度を上げる一方、金属侵食や有害な副産物を招く',
    source: 'recipe',
    learnedAt: 'ep01',
    relatedNotes: ['concentration-care'],
    roadmapStage: 1,
  },
]

/** ロードマップ段階定義（Dr.STONE式カリキュラム） */
export const ROADMAP_STAGES: RoadmapStage[] = [
  {
    stage: 0,
    title: '第0段 旅の始まり',
    description: '仮設テントと基礎試薬だけで始まる。まだ依頼は来ていない。',
    unlocks: {
      tools: ['試薬棚', '耐熱ガラス容器', '濾過紙・漏斗'],
      materials: ['蒸留水', 'リン酸', '塩酸', 'クエン酸'],
      knowledge: [],
    },
    scope: '依頼を待つ準備段階',
    nextPreview: {
      stage: 1,
      title: '第1段 酸と錆の基礎',
      hint: '港町の鍛冶師が、父の形見の古剣を持って訪れる。錆の正体を見極め、酸で落とす基礎を学ぶ。',
    },
  },
  {
    stage: 1,
    title: '第1段 酸と錆の基礎',
    description: '黒錆と塩化物錆の見分け、リン酸による除去、濃度と温度の加減を身につけた。',
    unlocks: {
      tools: ['加熱器具（温度計付き）', 'pH試験紙（簡易）'],
      materials: ['媒染剤（明礬・酢酸鉄）', '植物色素（ベニバナ・藍）'],
      knowledge: ['酸の使い分け（リン酸・塩酸）', '濃度の加減', '熱の加減', '錆の見分け（黒錆・塩化物錆）'],
    },
    scope: '金属の錆を酸で落とす基礎',
    nextPreview: {
      stage: 2,
      title: '第2段 染料と液の相性',
      hint: '染料職人が色落ちの相談に来る。液の性質で有機物の色を定着させる技法が開く。',
    },
  },
  {
    stage: 2,
    title: '第2段 染料と液の相性',
    description: '媒染剤と植物色素、pHによる色の変化、温度管理で染め分ける技法を得た。',
    unlocks: {
      tools: ['水質検査キット（簡易）', '蒸留装置（小型）'],
      materials: ['イオン交換樹脂', '沈殿試薬（硫酸バリウム等）'],
      knowledge: ['媒染の原理', 'pHと色の関係', '温度と染着のバランス'],
    },
    scope: '有機物の色を液の性質で定着させる',
    nextPreview: {
      stage: 3,
      title: '第3段 目に見えない粒（イオン）',
      hint: '井戸水の異常を調べる依頼。目に見えない粒を分離・検出する装置が手に入る。',
    },
  },
  {
    stage: 3,
    title: '第3段 目に見えない粒（イオン）',
    description: '水質検査と蒸留、沈殿反応でイオンを分離検出する基礎を習得。',
    unlocks: {
      tools: ['希釈器具（メスシリンダー・ピペット）', '指示薬（フェノールフタレイン等）'],
      materials: ['弱酸・弱塩基試薬', '緩衝液成分'],
      knowledge: ['水質検査の手順', '蒸留の原理', '沈殿反応での分離'],
    },
    scope: '目に見えない粒（イオン）を分離・検出する',
    nextPreview: {
      stage: 4,
      title: '第4段 弱い酸でも加減を誤れば傷む',
      hint: '貴族のパーティー用調合。希釈の概念と指示薬で、弱い酸でも精密に扱う技法が開く。',
    },
  },
  {
    stage: 4,
    title: '第4段 弱い酸でも加減を誤れば傷む（希釈と緩衝）',
    description: '弱酸・弱塩基、指示薬、緩衝液の概念で、精密な濃度制御が可能になった。',
    unlocks: {
      tools: ['触媒担持装置', '純度計算式（簡易版）', '合成経路図テンプレート'],
      materials: ['触媒（白金・酸化銅等）', '高純度試薬'],
      knowledge: ['希釈の計算', '指示薬の色変化', '緩衝液の働き'],
    },
    scope: '弱い酸でも加減を誤れば傷む、希釈の概念',
    nextPreview: {
      stage: 5,
      title: '第5段 混ざりものが少ないほど薬は正直に効く',
      hint: '熱病の集落で薬を作る依頼。触媒と合成経路で、純度を高め副産物を分離する技法が開く。',
    },
  },
  {
    stage: 5,
    title: '第5段 混ざりものが少ないほど薬は正直に効く（純度と合成）',
    description: '触媒、純度計算、合成経路図で、薬としての品質を設計できるようになった。',
    unlocks: {
      tools: ['用量計算式', '毒性試験キット', '倫理的判断フレーム'],
      materials: ['医薬品グレード原料'],
      knowledge: ['触媒反応の基礎', '純度計算と歩留まり', '合成経路の設計', '副産物分離の手法'],
    },
    scope: '混ざりものが少ないほど薬は正直に効く（純度・合成）',
    nextPreview: {
      stage: 6,
      title: '第6段 薬も毒も、量で決まる',
      hint: '薬をめぐる倫理的判断。用量と毒性、治療と害の境界線を引く責任が問われる。',
    },
  },
  {
    stage: 6,
    title: '第6段 薬も毒も、量で決まる（用量・毒性・倫理）',
    description: '用量概念、毒性試験、倫理的判断フレームで、薬としての責任ある扱いができる。',
    unlocks: {
      tools: [],
      materials: [],
      knowledge: ['用量反応曲線', '治療指数（TI）', '倫理的判断の枠組み', '毒性試験の読み方'],
    },
    scope: '薬も毒も、量で決まる',
    nextPreview: undefined,
  },
]

const NOTE_MAP = new Map(EP01_NOTES.map((n) => [n.id, n]))

export function getNote(id: string): KnowledgeNote | undefined {
  return NOTE_MAP.get(id)
}

export function getAllNotes(): KnowledgeNote[] {
  return [...EP01_NOTES]
}

export function getNotesByStage(stage: number): KnowledgeNote[] {
  return EP01_NOTES.filter((n) => n.roadmapStage <= stage)
}

export function getRoadmapStage(stage: number): RoadmapStage | undefined {
  return ROADMAP_STAGES.find((s) => s.stage === stage)
}

export function getCurrentRoadmapStage(): RoadmapStage {
  // Phase 2 時点では第1段完了として扱う
  return ROADMAP_STAGES[1] // stage 1
}

export function getNextRoadmapStage(): RoadmapStage | undefined {
  const current = getCurrentRoadmapStage()
  return ROADMAP_STAGES.find((s) => s.stage === current.stage + 1)
}

/**
 * ノートの見出し表記。
 * 記録前は作中表現のみ、記録済みなら化学名を併記する（二段表記）。
 */
export function formatNoteTitle(note: KnowledgeNote, learned: boolean): string {
  if (learned && note.chemTerm) {
    return `${note.worldTerm}（${note.chemTerm}）`
  }
  return note.worldTerm
}

/** 知識ノート全体の状態（GameState などから参照） */
export type KnowledgeState = {
  notes: Set<string> // 記録済みノートID
  crafted: CraftedRecord[]
  analysisTags: AnalysisTag[]
  reactions: ReactionRecord[]
  currentRoadmapStage: number
}

export function createInitialKnowledgeState(): KnowledgeState {
  return {
    notes: new Set<string>(),
    crafted: [],
    analysisTags: [],
    reactions: [],
    currentRoadmapStage: 0,
  }
}

/** ノートを記録する（重複しない） */
export function recordNote(state: KnowledgeState, noteId: string): boolean {
  const note = getNote(noteId)
  if (!note) return false
  if (state.notes.has(noteId)) return false
  state.notes.add(noteId)
  return true
}

/** 複数のノートを一括記録 */
export function recordNotes(state: KnowledgeState, noteIds: string[]): string[] {
  const newlyRecorded: string[] = []
  for (const id of noteIds) {
    if (recordNote(state, id)) {
      newlyRecorded.push(id)
    }
  }
  return newlyRecorded
}

/** 品目作成を記録 */
export function recordCrafted(
  state: KnowledgeState,
  record: Omit<CraftedRecord, 'id' | 'timestamp'>
): CraftedRecord {
  const crafted: CraftedRecord = {
    ...record,
    id: `crafted-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  }
  state.crafted.push(crafted)
  return crafted
}

/** 分析タグを記録 */
export function recordAnalysisTag(
  state: KnowledgeState,
  tag: Omit<AnalysisTag, 'id' | 'timestamp'>
): AnalysisTag {
  const analysisTag: AnalysisTag = {
    ...tag,
    id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  }
  state.analysisTags.push(analysisTag)
  return analysisTag
}

/** 依頼人の反応を記録 */
export function recordReaction(
  state: KnowledgeState,
  reaction: Omit<ReactionRecord, 'id' | 'timestamp'>
): ReactionRecord {
  const reactionRecord: ReactionRecord = {
    ...reaction,
    id: `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  }
  state.reactions.push(reactionRecord)
  return reactionRecord
}

/** ロードマップ段階を進める */
export function advanceRoadmapStage(state: KnowledgeState, newStage: number): boolean {
  if (newStage > state.currentRoadmapStage && newStage < ROADMAP_STAGES.length) {
    state.currentRoadmapStage = newStage
    return true
  }
  return false
}

/** 指定段階までのノートを自動記録（エピソード完了時など） */
export function autoRecordStageNotes(state: KnowledgeState, stage: number): string[] {
  const stageNotes = EP01_NOTES.filter((n) => n.roadmapStage <= stage)
  const noteIds = stageNotes.map((n) => n.id)
  return recordNotes(state, noteIds)
}