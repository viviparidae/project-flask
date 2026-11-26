/**
 * dialogueEngine.ts — 線形ノベル対話エンジン
 *
 * プレイヤーは選択肢を持たず、「次へ」ボタンで会話を進める。
 * 会話を通じて依頼の内容・背景が自然に明らかになる。
 * Phase 1 追加: 納品後の依頼人反応会話（結果グレードによる分岐）
 */

export type Speaker = 'narrator' | 'gard' | '錬金術師'
export type Mood = 'neutral' | 'sad' | 'tense' | 'hopeful' | 'analytical' | 'angry' | 'grateful' | 'disappointed'

export const MOOD_EMOJI: Record<Mood, string> = {
  neutral: '😐',
  sad: '😔',
  tense: '😤',
  hopeful: '🙂',
  analytical: '🤔',
  angry: '😡',
  grateful: '😊',
  disappointed: '😞',
}

export const MOOD_COLOR: Record<Mood, string> = {
  neutral: '#7a8a9a',
  sad: '#7090b8',
  tense: '#f87171',
  hopeful: '#65e6ad',
  analytical: '#8bcfef',
  angry: '#f87171',
  grateful: '#4ade80',
  disappointed: '#facc15',
}

export type DialogueNode = {
  id: string
  speaker: Speaker
  speakerName: string
  text: string
  mood: Mood
  nextNodeId: string | null
}

/** エピソード1 本編会話 */
export const ep01Story: Record<string, DialogueNode> = {
  s01: {
    id: 's01',
    speaker: 'narrator',
    speakerName: '——',
    text: '砂塵舞う荒野の端、日が傾きかけた頃。\n旅の錬金術師の仮設テントに、夕風が吹き込んだ。\n試薬の匂いと、遠い焚き火の煙の匂いが混ざる。',
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
    text: '「……やっている、か。\n旅の錬金術師というのは、あんたのことか。」',
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
    speaker: '錬金術師',
    speakerName: '（錬金術師）',
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
    speaker: '錬金術師',
    speakerName: '（錬金術師）',
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

/** 納品後・依頼人の反応会話（結果グレード別分岐） */
export const ep01PostDelivery: Record<string, Record<string, DialogueNode>> = {
  // PERFECT: 完全修復
  PERFECT: {
    pd01: {
      id: 'pd01',
      speaker: 'gard',
      speakerName: 'ガルド',
      text: '剣を受け取った瞬間、ガルドの目が見開かれた。\n\n「……嘘だろ。これ、本当に同じ剣か？」\n\n彼は刃を光にかざし、しばらく言葉を失っていた。\n黒い膜は跡形もなく、鋼本来の輝きが鮮やかに蘇っている。',
      mood: 'grateful',
      nextNodeId: 'pd02',
    },
    pd02: {
      id: 'pd02',
      speaker: 'gard',
      speakerName: 'ガルド',
      text: '「親父の顔が、刃に映っている。……ありがとう。\n本当に、ありがとう。」\n\n鍛冶師の目に、光るものが見えた。\n重い布で丁寧に剣を包み直す指先が、わずかに震えている。',
      mood: 'grateful',
      nextNodeId: 'pd03',
    },
    pd03: {
      id: 'pd03',
      speaker: 'narrator',
      speakerName: '——',
      text: 'ガルドは深く頭を下げ、報酬の袋をテーブルに置いた。\n\n「また、何かあったら頼む。\n次はもっといい酒でも持ってくるよ。」\n\n夕闇の中、満足げな足取りでテントを後にする背中が、いつもより軽やかに見えた。',
      mood: 'neutral',
      nextNodeId: null,
    },
  },
  // GOOD: 良好な修復
  GOOD: {
    pd01: {
      id: 'pd01',
      speaker: 'gard',
      speakerName: 'ガルド',
      text: '剣を受け取り、ガルドは刃先から根元まで念入りに眺めた。\n\n「……おお。大分違うな。\nこれなら実戦で使える。」\n\nわずかに残った薄い痕跡を指でなぞりながら、彼は頷いた。',
      mood: 'hopeful',
      nextNodeId: 'pd02',
    },
    pd02: {
      id: 'pd02',
      speaker: 'gard',
      speakerName: 'ガルド',
      text: '「完璧じゃないが……これだけ戻れば上等だ。助かった。\n親父も、これなら納得するだろう。」',
      mood: 'grateful',
      nextNodeId: 'pd03',
    },
    pd03: {
      id: 'pd03',
      speaker: 'narrator',
      speakerName: '——',
      text: 'ガルドは報酬を払い、剣を大切そうに布で包んだ。\n\n「また頼むかもしれない。\nその時は、よろしく。」\n\n背中を向けた彼の歩みには、安堵の色が滲んでいた。',
      mood: 'neutral',
      nextNodeId: null,
    },
  },
  // PARTIAL: 修復不完全
  PARTIAL: {
    pd01: {
      id: 'pd01',
      speaker: 'gard',
      speakerName: 'ガルド',
      text: '剣を手に取ったガルドの眉が、わずかに寄った。\n\n「……まあ、マシにはなってる。\nだが、まだ深いところの錆が残ってるな。」\n\n彼は刃の根元付近、まだ黒ずんだ部分を指で示した。',
      mood: 'disappointed',
      nextNodeId: 'pd02',
    },
    pd02: {
      id: 'pd02',
      speaker: 'gard',
      speakerName: 'ガルド',
      text: '「これじゃ、またすぐ錆び戻る。\n……もう一回、やり直せるか？」\n\n声に責める色はないが、期待していた分だけ落胩も滲んでいる。',
      mood: 'disappointed',
      nextNodeId: 'pd03',
    },
    pd03: {
      id: 'pd03',
      speaker: 'narrator',
      speakerName: '——',
      text: 'ガルドは渋々報酬を払い、剣を布に包んだ。\n\n「……また来る。次は頼むぞ。」\n\nその言葉には、突き放すような、しかし信頼を捨てきれない複雑な響きがあった。',
      mood: 'neutral',
      nextNodeId: null,
    },
  },
  // DAMAGED / FAILED: 失敗・事故
  DAMAGED: {
    pd01: {
      id: 'pd01',
      speaker: 'gard',
      speakerName: 'ガルド',
      text: '剣を見た瞬間、ガルドの表情が凍りついた。\n\n「……何をしてくれた……！\nこれじゃ、親父の形見が、台無しだ！」\n\n刃の表面は白く荒れ、エッジは丸まっている。\n処理液が腐食だけでなく、金属母材まで攻撃してしまったのだ。',
      mood: 'angry',
      nextNodeId: 'pd02',
    },
    pd02: {
      id: 'pd02',
      speaker: 'gard',
      speakerName: 'ガルド',
      text: '「弁償なんてできるわけねえだろ！\nこれは……金でどうなるもんじゃねえ！」\n\n激昂した彼の手が、テーブルを叩く。\nテントの中に、重苦しい沈黙が降りた。',
      mood: 'angry',
      nextNodeId: 'pd03',
    },
    pd03: {
      id: 'pd03',
      speaker: 'narrator',
      speakerName: '——',
      text: 'ガルドは報酬を置かず、剣を乱暴に布で包んで立ち去った。\n\nテントの入り口で、彼は振り向かずに言った。\n\n「……二度と、顔も見せねえ方がいい。」\n\n砂塵の中に消えていく背中が、かつてないほど重く見えた。',
      mood: 'neutral',
      nextNodeId: null,
    },
  },
}

export type DialogueState = {
  nodeId: string
}

export const initialDialogueState: DialogueState = {
  nodeId: 's01',
}

export const dialogueNodes = ep01Story

/** 納品後会話ノードを取得 */
export function getPostDeliveryNodes(grade: string): Record<string, DialogueNode> {
  return ep01PostDelivery[grade] || ep01PostDelivery.DAMAGED
}

/** 初期納品後ノードIDを取得 */
export function getInitialPostDeliveryNodeId(grade: string): string {
  return 'pd01'
}