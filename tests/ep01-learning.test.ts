import { beforeEach, describe, expect, it } from 'vitest'
import {
  EP01_NOTES,
  ROADMAP_STAGES,
  getNote,
  getAllNotes,
  getNotesByStage,
  getRoadmapStage,
  getCurrentRoadmapStage,
  getNextRoadmapStage,
  formatNoteTitle,
  createInitialKnowledgeState,
  recordNote,
  recordNotes,
  recordCrafted,
  recordAnalysisTag,
  recordReaction,
  advanceRoadmapStage,
  autoRecordStageNotes,
  type KnowledgeState,
  type KnowledgeNote,
  type CraftedRecord,
  type AnalysisTag,
  type ReactionRecord,
  type RoadmapStage,
} from '../src/lib/knowledge'

describe('[知識ノート] ノート定義', () => {
  it('EP01 のノートは7種ある', () => {
    expect(EP01_NOTES.map((n) => n.id)).toEqual([
      'rust',
      'black-rust',
      'chloride-rust',
      'acid-phosphoric',
      'acid-hydrochloric',
      'concentration-care',
      'heat-care',
    ])
  })

  it('各ノートに source と roadmapStage が設定されている', () => {
    for (const note of EP01_NOTES) {
      expect(['recipe', 'dialogue', 'observation', 'reaction']).toContain(note.source)
      expect(note.roadmapStage).toBeGreaterThanOrEqual(0)
      expect(note.learnedAt).toBe('ep01')
    }
  })

  it('見出しは未記録なら作中表現のみ、記録済みなら化学名を併記する（二段表記）', () => {
    const note = getNote('black-rust')!
    expect(formatNoteTitle(note, false)).toBe('黒錆')
    expect(formatNoteTitle(note, true)).toBe('黒錆（Fe₃O₄）')
  })
})

describe('[知識ノート] ロードマップ段階', () => {
  it('ロードマップは第0段〜第6段の7段階ある', () => {
    expect(ROADMAP_STAGES.map((s) => s.stage)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('各段階に unlocks・scope・nextPreview（最終段以外）がある', () => {
    for (const stage of ROADMAP_STAGES) {
      expect(stage.unlocks.tools).toBeDefined()
      expect(stage.unlocks.materials).toBeDefined()
      expect(stage.unlocks.knowledge).toBeDefined()
      expect(stage.scope).toBeDefined()
      if (stage.stage < 6) {
        expect(stage.nextPreview).toBeDefined()
        expect(stage.nextPreview?.stage).toBe(stage.stage + 1)
      } else {
        expect(stage.nextPreview).toBeUndefined()
      }
    }
  })

  it('getCurrentRoadmapStage は第1段を返す（Phase 2 時点）', () => {
    const current = getCurrentRoadmapStage()
    expect(current.stage).toBe(1)
    expect(current.title).toBe('第1段 酸と錆の基礎')
  })

  it('getNextRoadmapStage は第2段を返す', () => {
    const next = getNextRoadmapStage()
    expect(next?.stage).toBe(2)
    expect(next?.title).toBe('第2段 染料と液の相性')
  })

  it('getRoadmapStage で任意の段階を取得できる', () => {
    expect(getRoadmapStage(0)?.title).toBe('第0段 旅の始まり')
    expect(getRoadmapStage(3)?.title).toBe('第3段 目に見えない粒（イオン）')
    expect(getRoadmapStage(99)).toBeUndefined()
  })

  it('getNotesByStage で該当段階までのノートが取得できる', () => {
    const stage0 = getNotesByStage(0)
    expect(stage0.length).toBe(0)

    const stage1 = getNotesByStage(1)
    expect(stage1.length).toBe(EP01_NOTES.length) // EP01 全ノートは stage 1
    expect(stage1.map((n) => n.id).sort()).toEqual(EP01_NOTES.map((n) => n.id).sort())
  })
})

describe('[知識ノート] 状態管理と自動記録', () => {
  let state: KnowledgeState

  beforeEach(() => {
    state = createInitialKnowledgeState()
  })

  it('初期状態ではノート・品目・分析タグ・反応・ロードマップ段階0', () => {
    expect(state.notes.size).toBe(0)
    expect(state.crafted).toHaveLength(0)
    expect(state.analysisTags).toHaveLength(0)
    expect(state.reactions).toHaveLength(0)
    expect(state.currentRoadmapStage).toBe(0)
  })

  it('recordNote で単一ノートを記録できる（重複しない）', () => {
    expect(recordNote(state, 'rust')).toBe(true)
    expect(state.notes.has('rust')).toBe(true)
    expect(recordNote(state, 'rust')).toBe(false) // 重複は false
    expect(state.notes.size).toBe(1)
  })

  it('recordNotes で複数ノートを一括記録できる', () => {
    const newly = recordNotes(state, ['rust', 'black-rust', 'chloride-rust'])
    expect(newly).toEqual(['rust', 'black-rust', 'chloride-rust'])
    expect(state.notes.size).toBe(3)
    // 重複込みで再実行しても増えない
    const again = recordNotes(state, ['rust', 'acid-phosphoric'])
    expect(again).toEqual(['acid-phosphoric'])
    expect(state.notes.size).toBe(4)
  })

  it('recordCrafted で作った品目が記録される', () => {
    const crafted = recordCrafted(state, {
      episodeId: 'ep01',
      recipeId: 'ep01-rust-removal',
      recipeName: '黒錆の除去',
      qualityTier: 'perfect',
    })
    expect(state.crafted).toHaveLength(1)
    expect(crafted.recipeName).toBe('黒錆の除去')
    expect(crafted.qualityTier).toBe('perfect')
    expect(crafted.id).toMatch(/^crafted-\d+-[a-z0-9]+$/)
    expect(crafted.timestamp).toBeGreaterThan(0)
  })

  it('recordAnalysisTag で分析タグが記録される', () => {
    const tag = recordAnalysisTag(state, {
      episodeId: 'ep01',
      label: '黒錆',
      description: '表面を覆う黒い層。磁石に引き寄せられる',
    })
    expect(state.analysisTags).toHaveLength(1)
    expect(tag.label).toBe('黒錆')
    expect(tag.id).toMatch(/^tag-\d+-[a-z0-9]+$/)
  })

  it('recordReaction で依頼人の反応が記録される', () => {
    const reaction = recordReaction(state, {
      episodeId: 'ep01',
      clientName: 'ガルド',
      outcomeGrade: 'PERFECT',
      summary: '親父の顔が刃に映っている。本当にありがとう。',
    })
    expect(state.reactions).toHaveLength(1)
    expect(reaction.clientName).toBe('ガルド')
    expect(reaction.outcomeGrade).toBe('PERFECT')
    expect(reaction.id).toMatch(/^reaction-\d+-[a-z0-9]+$/)
  })

  it('advanceRoadmapStage で段階が進む（戻らない・飛ばせない）', () => {
    expect(advanceRoadmapStage(state, 1)).toBe(true)
    expect(state.currentRoadmapStage).toBe(1)
    expect(advanceRoadmapStage(state, 1)).toBe(false) // 同じ段階は進まない
    expect(advanceRoadmapStage(state, 0)).toBe(false) // 戻れない
    expect(advanceRoadmapStage(state, 3)).toBe(true) // 飛び級は許容（順序は呼び出し側で制御）
    expect(state.currentRoadmapStage).toBe(3)
  })

  it('autoRecordStageNotes で段階までのノートが自動記録される', () => {
    const newly = autoRecordStageNotes(state, 1)
    expect(newly.length).toBe(EP01_NOTES.length)
    expect(state.notes.size).toBe(EP01_NOTES.length)
    // 再実行しても増えない
    const again = autoRecordStageNotes(state, 1)
    expect(again).toEqual([])
    expect(state.notes.size).toBe(EP01_NOTES.length)
  })
})

describe('[知識ノート] EP01 完了シナリオ: 記録が残る・ロードマップが進む', () => {
  it('観察→レシピ実行→納品の一連で、ノート・品目・分析タグ・反応が自動記録され、ロードマップが第1段になる', () => {
    const state = createInitialKnowledgeState()

    // 1. 観察パート: 錆・塩化物錆・出自の分析タグを記録
    recordAnalysisTag(state, { episodeId: 'ep01', label: '黒錆', description: '表面の黒い層' })
    recordAnalysisTag(state, { episodeId: 'ep01', label: '塩化物錆', description: '白灰色の錆、港町由来' })
    recordAnalysisTag(state, { episodeId: 'ep01', label: '出自', description: '父の形見、シルトハーフェンの鍛冶場' })
    expect(state.analysisTags).toHaveLength(3)

    // 2. レシピ提示・実行: 観察ノート自動記録 + レシピ実行で品目記録
    autoRecordStageNotes(state, 1) // 第1段ノート全記録
    recordCrafted(state, {
      episodeId: 'ep01',
      recipeId: 'ep01-rust-removal',
      recipeName: '黒錆の除去',
      qualityTier: 'perfect',
    })
    expect(state.notes.size).toBe(EP01_NOTES.length)
    expect(state.crafted).toHaveLength(1)

    // 3. 納品・反応: 依頼人の反応記録 + ロードマップ第1段完了
    recordReaction(state, {
      episodeId: 'ep01',
      clientName: 'ガルド',
      outcomeGrade: 'PERFECT',
      summary: '親父の顔が刃に映っている。本当にありがとう。',
    })
    advanceRoadmapStage(state, 1)
    expect(state.reactions).toHaveLength(1)
    expect(state.currentRoadmapStage).toBe(1)

    // 4. ロードマップ表示確認
    const currentStage = getRoadmapStage(state.currentRoadmapStage)!
    expect(currentStage.title).toBe('第1段 酸と錆の基礎')
    expect(currentStage.unlocks.knowledge).toContain('酸の使い分け（リン酸・塩酸）')

    const nextPreview = currentStage.nextPreview!
    expect(nextPreview.title).toBe('第2段 染料と液の相性')
    expect(nextPreview.hint).toContain('染料職人')
  })

  it('品質 GOOD でも記録は残る（ロードマップも進む）', () => {
    const state = createInitialKnowledgeState()
    autoRecordStageNotes(state, 1)
    recordCrafted(state, {
      episodeId: 'ep01',
      recipeId: 'ep01-rust-removal',
      recipeName: '黒錆の除去',
      qualityTier: 'good',
    })
    recordReaction(state, {
      episodeId: 'ep01',
      clientName: 'ガルド',
      outcomeGrade: 'GOOD',
      summary: '大分違うな。これなら実戦で使える。',
    })
    advanceRoadmapStage(state, 1)

    expect(state.crafted[0].qualityTier).toBe('good')
    expect(state.reactions[0].outcomeGrade).toBe('GOOD')
    expect(state.currentRoadmapStage).toBe(1)
  })

  it('品質 PARTIAL でも記録は残る（ロードマップも進む）', () => {
    const state = createInitialKnowledgeState()
    autoRecordStageNotes(state, 1)
    recordCrafted(state, {
      episodeId: 'ep01',
      recipeId: 'ep01-rust-removal',
      recipeName: '黒錆の除去',
      qualityTier: 'partial',
    })
    recordReaction(state, {
      episodeId: 'ep01',
      clientName: 'ガルド',
      outcomeGrade: 'PARTIAL',
      summary: 'まだ深いところの錆が残ってるな。もう一回、やり直せるか？',
    })
    advanceRoadmapStage(state, 1)

    expect(state.crafted[0].qualityTier).toBe('partial')
    expect(state.reactions[0].outcomeGrade).toBe('PARTIAL')
    expect(state.currentRoadmapStage).toBe(1)
  })
})