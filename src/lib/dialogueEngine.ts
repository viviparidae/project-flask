/**
 * dialogueEngine.ts — 線形ノベル対話エンジン
 *
 * VA-11 Hall-A / Coffee Talk スタイル:
 * プレイヤーは選択肢を持たず、「次へ」ボタンで会話を進める。
 * 会話を通じて依頼の内容・背景が自然に明らかになる。
 */

export type Speaker = 'narrator' | 'gard' | 'chemist'
export type Mood = 'neutral' | 'sad' | 'tense' | 'hopeful' | 'analytical' | 'angry'

export const MOOD_EMOJI: Record<Mood, string> = {
  neutral: '😐',
  sad: '😔',
  tense: '😤',
  hopeful: '🙂',
  analytical: '🤔',
  angry: '😡',
}

export const MOOD_COLOR: Record<Mood, string> = {
  neutral: '#7a8a9a',
  sad: '#7090b8',
  tense: '#f87171',
  hopeful: '#65e6ad',
  analytical: '#8bcfef',
  angry: '#f87171',
}

export type DialogueNode = {
  id: string
  speaker: Speaker
  speakerName: string
  text: string
  mood: Mood
  nextNodeId: string | null
}

export const ep01Story: Record<string, DialogueNode> = {
  s01: {
    id: 's01',
    speaker: 'narrator',
    speakerName: '——',
    text: '砂塵舞う荒野の端、日が傾きかけた頃。\n旅の化学者の仮設テントに、夕風が吹き込んだ。\n試薬の匂いと、遠い焚き火の煙の匂いが混ざる。',
    mood: 'neutral',
    nextNodeId: 's02',
  },
  s02: {
    id: 's02',
    speaker: 'narrator',
    speakerName: '——',
    text: '入り口の布を分けて、大柄な影が差し込んだ。\n鍛冶師と分かる革エプロン、傷だらけの両手。\n胸の前に、布に包まれた細長い何かを抱えている。',
    mood: 'neutral',
    nextNodeId: 's03',
  },
  s03: {
    id: 's03',
    speaker: 'gard',
    speakerName: 'ガルド',
    text: '「……やっている、か。\n旅の化学者というのは、あんたのことか。」',
    mood: 'neutral',
    nextNodeId: 's04',
  },
  s04: {
    id: 's04',
    speaker: 'narrator',
    speakerName: '——',
    text: '男の目が、棚に並んだ試薬瓶をゆっくりと眺めた。\n疑いと、かすかな期待が混ざった視線だった。\n私は手を止め、椅子を勧めた。男は座らなかった。',
    mood: 'tense',
    nextNodeId: 's05',
  },
  s05: {
    id: 's05',
    speaker: 'gard',
    speakerName: 'ガルド',
    text: '「頼みがある。これを見てほしい。」\n\n男が布をほどくと、黒ずんだ長剣が現れた。\n刃全体が、厚い腐食の膜に覆われている。\n本来の金属光沢は、まったく見えなかった。',
    mood: 'sad',
    nextNodeId: 's06',
  },
  s06: {
    id: 's06',
    speaker: 'chemist',
    speakerName: '（化学者）',
    text: '剣を手に取った。\n\n表面の腐食は二層になっている。\n上層に黒い酸化物——Fe₃O₄、いわゆる黒錆。\n下層には、白灰色の塩化物錆が見える。\n\n……塩分を含んだ環境で長期間さらされた証だ。',
    mood: 'analytical',
    nextNodeId: 's07',
  },
  s07: {
    id: 's07',
    speaker: 'gard',
    speakerName: 'ガルド',
    text: '「親父の形見だ。\n若い頃、港町シルトハーフェンの鍛冶場で働いていたと聞いた。\n死んで初めて、荷物の中からこれが出てきた。」\n\n男の声が、わずかに震えた。',
    mood: 'sad',
    nextNodeId: 's08',
  },
  s08: {
    id: 's08',
    speaker: 'chemist',
    speakerName: '（化学者）',
    text: '——港町。海塩にさらされた鉄に特有の腐食だ。\n\nFe₃O₄とFeCl₂の複合構造。\n塩酸を使えば塩化物錆を悪化させる危険がある。\nリン酸なら金属母材を傷めず、両方の錆に対処できる。\n\n……できる。やってみる価値はある。',
    mood: 'analytical',
    nextNodeId: 's09',
  },
  s09: {
    id: 's09',
    speaker: 'gard',
    speakerName: 'ガルド',
    text: '「……あんたに任せたい。なんとかなるか。」\n\n男の目に、初めてまっすぐな期待の色が見えた。',
    mood: 'hopeful',
    nextNodeId: 's10',
  },
  s10: {
    id: 's10',
    speaker: 'narrator',
    speakerName: '——',
    text: '「やってみましょう。」\n\n私は試薬棚の前に立ち、道具を並べ始めた。\nガルドは無言で、テントの隅に腰を下ろした。',
    mood: 'neutral',
    nextNodeId: null,
  },
}

export type DialogueState = {
  nodeId: string
}

export const initialDialogueState: DialogueState = {
  nodeId: 's01',
}

export const dialogueNodes = ep01Story
