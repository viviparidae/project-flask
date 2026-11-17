/**
 * knowledge.ts — 知識ノート（Field Notes）
 *
 * 学習プログレッション設計（docs/design/learning-progression.md）に基づく、
 * プレイヤーが獲得した化学概念の定義。
 *
 * 運用ルール:
 * - 獲得前は作中表現（worldTerm）でのみ言及し、化学名は出さない
 * - 獲得後は化学名（chemTerm）を併記する「二段表記」にする
 * - ラボのヒントは獲得済みノートの範囲だけから出す
 */

export type KnowledgeNote = {
  id: string
  /** 作中表現（先に表示される言葉） */
  worldTerm: string
  /** 平易な説明 */
  plainText: string
  /** 化学名（獲得後に併記される） */
  chemTerm?: string
  /** 化学的な補足 */
  chemText?: string
  /** 獲得エピソード */
  learnedAt: string
  relatedNotes: string[]
}

/** EP01「古剣の腐食」で獲得できるノート */
export const EP01_NOTES: KnowledgeNote[] = [
  {
    id: 'rust',
    worldTerm: '錆',
    plainText: '金属が空気と水に食われた跡。放っておくと広がる',
    chemTerm: '酸化（腐食）',
    chemText: '鉄が酸素や水と結びついて性質が変わる現象',
    learnedAt: 'ep01',
    relatedNotes: ['black-rust', 'chloride-rust'],
  },
  {
    id: 'black-rust',
    worldTerm: '黒錆',
    plainText: '表面を覆う黒い錆の層。硬く、刃全体を包んでいる',
    chemTerm: 'Fe₃O₄',
    chemText: '四酸化三鉄。磁鉄鉱と同じ組成の酸化物',
    learnedAt: 'ep01',
    relatedNotes: ['rust'],
  },
  {
    id: 'chloride-rust',
    worldTerm: '白っぽい錆',
    plainText: '海の塩が運んだ白灰色の錆。普通の錆より性質が悪く、放っておくと食い進む',
    chemTerm: '塩化物錆',
    chemText: 'FeCl₂ など塩化物を含む腐食生成物。塩酸を使うと悪化する',
    learnedAt: 'ep01',
    relatedNotes: ['rust', 'acid-strength'],
  },
  {
    id: 'acid-strength',
    worldTerm: '酸の強さ',
    plainText: '酸には「よく溶かすが荒いもの」と「穏やかなもの」がある。相手に合わせて選ぶ',
    chemTerm: '酸の種類と性質',
    chemText: '塩酸は強力だが塩化物錆を悪化させる。リン酸は金属を傷めず錆に効く',
    learnedAt: 'ep01',
    relatedNotes: ['chloride-rust', 'concentration'],
  },
  {
    id: 'concentration',
    worldTerm: '濃さの加減',
    plainText: '濃いほど強力だが、相手まで傷める。薄すぎれば届かない',
    chemTerm: '濃度',
    chemText: '処置液の濃さ。錆の除去と金属の侵食のバランスを決める',
    learnedAt: 'ep01',
    relatedNotes: ['acid-strength', 'heat-risk'],
  },
  {
    id: 'heat-risk',
    worldTerm: '熱の危うさ',
    plainText: '熱は反応を速めるが、暴走と「余計なもの」を招く',
    chemTerm: '温度依存性・副反応',
    chemText: '高温は反応速度を上げる一方、金属侵食や有害な副産物を招く',
    learnedAt: 'ep01',
    relatedNotes: ['concentration'],
  },
]

export const ALL_NOTES: KnowledgeNote[] = [...EP01_NOTES]

const NOTE_MAP = new Map(ALL_NOTES.map((n) => [n.id, n]))

export function getNote(id: string): KnowledgeNote | undefined {
  return NOTE_MAP.get(id)
}

/**
 * ノートの見出し表記。
 * 未獲得なら作中表現のみ、獲得済みなら化学名を併記する（二段表記）。
 */
export function formatNoteTitle(note: KnowledgeNote, learned: boolean): string {
  if (learned && note.chemTerm) {
    return `${note.worldTerm}（${note.chemTerm}）`
  }
  return note.worldTerm
}
