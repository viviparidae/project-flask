/**
 * dialogueEngine.ts — 線形ノベル対話エンジン
 *
 * プレイヤーは選択肢を持たず、「次へ」ボタンで会話を進める。
 * 会話を通じて依頼の内容・背景が自然に明らかになる。
 * Phase 1 追加: 納品後の依頼人反応会話（結果グレードによる分岐）
 */

export type Speaker = 'narrator' | 'gard' | '錬金術師' | 'nara' | 'merchant'
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

/** 初期納品後ノードIDを取得 */
export function getInitialPostDeliveryNodeId(grade: string): string {
  return 'pd01'
}

/** エピソード別・納品後会話ノードを取得 */
export function getPostDeliveryNodes(grade: string, episodeId: string = 'ep01'): Record<string, DialogueNode> {
  const postDeliveryMap: Record<string, Record<string, Record<string, DialogueNode>>> = {
    ep01: ep01PostDelivery,
    ep02: ep02PostDelivery,
    ep03: ep03PostDelivery,
  }
  const episodePostDelivery = postDeliveryMap[episodeId] || ep01PostDelivery
  return episodePostDelivery[grade] || episodePostDelivery.DAMAGED
}

/** エピソード2「染料職人の失敗」 本編会話 */
export const ep02Story: Record<string, DialogueNode> = {
  s01: {
    id: 's01',
    speaker: 'narrator',
    speakerName: '——',
    text: '翌朝、テントの前で染料の匂いが漂う中、若い女が立っていた。\n指先と袖が幾重もの色に染まっている。\n彼女は呼吸を整え、手にした布切れを差し出した。',
    mood: 'neutral',
    nextNodeId: 's02',
  },
  s02: {
    id: 's02',
    speaker: 'narrator',
    speakerName: '——',
    text: 'それは鮮やかな紅色のはずの絹布だった。\nだが、色はまだらに剥げ落ち、ところどころ白い地が見えている。\n染め直しの跡なのか、最初から失敗作なのか。',
    mood: 'analytical',
    nextNodeId: 's03',
  },
  s03: {
    id: 's03',
    speaker: 'nara',
    speakerName: 'ナーラ',
    text: '「これ、直せますか？\nベニバナで染めたんですが、媒染がうまくいかなくて……\n明礬を使ったはずなのに、色が定着しないんです。」',
    mood: 'tense',
    nextNodeId: 's04',
  },
  s04: {
    id: 's04',
    speaker: 'narrator',
    speakerName: '——',
    text: '布を広げて観察する。\n色素はカルタミン——ベニバナ特有の赤色素だ。\n水溶性で、そのままでは繊維に定着しない。\n明礬（アルミニウム媒染剤）でキレート錯体を作れば定着するはずだが……',
    mood: 'analytical',
    nextNodeId: 's05',
  },
  s05: {
    id: 's05',
    speaker: 'narrator',
    speakerName: '——',
    text: 'pHが合っていない。\n酢酸緩衝液でpH 4〜5に保ちながら媒染しないと、\nアルミニウムイオンがうまく働かず、色素が流出してしまう。\n温度も沸騰させるとカルタミンが分解する。60〜70℃が限界だ。',
    mood: 'analytical',
    nextNodeId: 's06',
  },
  s06: {
    id: 's06',
    speaker: 'nara',
    speakerName: 'ナーラ',
    text: '「pH……緩衝液……温度管理……。\nわたし、適当に煮てただけでした。\nもう一度、ちゃんとやらせてください！」',
    mood: 'hopeful',
    nextNodeId: 's07',
  },
  s07: {
    id: 's07',
    speaker: 'narrator',
    speakerName: '——',
    text: '「わかりました。レシピ通りに媒染処理をしましょう。」\n\nナーラは真剣な眼差しで、こちらの手元を見守る。\n彼女にとって、この布は単なる失敗作ではないらしい。\n依頼人の期待を背負って、調合を開始する。',
    mood: 'neutral',
    nextNodeId: null,
  },
}

/** エピソード3「廃酸中和の小さな依頼」 本編会話 */
export const ep03Story: Record<string, DialogueNode> = {
  s01: {
    id: 's01',
    speaker: 'narrator',
    speakerName: '——',
    text: '午後、旅装束の男がテントを訪れた。\n荷車には密封された樽がいくつも積まれている。\n商人の風体だが、どこか急いでいる様子だ。',
    mood: 'neutral',
    nextNodeId: 's02',
  },
  s02: {
    id: 's02',
    speaker: 'merchant',
    speakerName: '旅の商人',
    text: '「悪いが、急ぎで頼みたい。\n輸送中に硫酸の樽が傾いて、中身が漏れ出した。\n中和して安全な状態にしてほしい——今すぐだ。」',
    mood: 'tense',
    nextNodeId: 's03',
  },
  s03: {
    id: 's03',
    speaker: 'narrator',
    speakerName: '——',
    text: '樽を開けると、刺激臭が立ち上る。\n希薄な硫酸だが、量が多い。\n金属容器を溶かさないうちに、炭酸水素ナトリウムで中和しなければならない。\n発熱と二酸化炭素の発生に注意しながら、慎重に進める。',
    mood: 'analytical',
    nextNodeId: 's04',
  },
  s04: {
    id: 's04',
    speaker: 'merchant',
    speakerName: '旅の商人',
    text: '「重曹で中和するのは知ってる。\nだが、終点の見極めを間違えると、\n酸性のまま運ぶことになるか、アルカリ性に振れすぎてまた危険だ。\n指示薬とpH試験紙、両方で確実に頼む。」',
    mood: 'analytical',
    nextNodeId: 's05',
  },
  s05: {
    id: 's05',
    speaker: 'narrator',
    speakerName: '——',
    text: '商人は化学を知っている。\nフェノールフタレインでpH 8.2以上の紅色を確認し、\nさらにpH試験紙で中性域（6〜8）を二重確認する——\nそれが安全な輸送の条件だ。\n小さな依頼だが、手順を疎かにできない。',
    mood: 'neutral',
    nextNodeId: null,
  },
}

/** エピソード2 納品後・依頼人の反応会話 */
export const ep02PostDelivery: Record<string, Record<string, DialogueNode>> = {
  PERFECT: {
    pd01: {
      id: 'pd01',
      speaker: 'nara',
      speakerName: 'ナーラ',
      text: '布を広げた瞬間、ナーラの瞳が輝いた。\n\n「嘘……この色、ベニバナの紅そのままだ……！\n媒染がきれいに決まってる。これなら商品になる！」\n\n彼女は布を胸に抱き、何度も色を確認している。',
      mood: 'grateful',
      nextNodeId: 'pd02',
    },
    pd02: {
      id: 'pd02',
      speaker: 'nara',
      speakerName: 'ナーラ',
      text: '「pH緩衝液と温度管理……これが正解だったんですね。\n師匠にも、これで胸を張って報告できます。\n本当にありがとうございました！」',
      mood: 'grateful',
      nextNodeId: 'pd03',
    },
    pd03: {
      id: 'pd03',
      speaker: 'narrator',
      speakerName: '——',
      text: 'ナーラは報酬を置き、大切そうに布を包んで駆けていった。\n\n「また、迷ったら来ます！\n次は藍染めで相談させてください！」\n\n彼女の背中は、朝よりずっと軽やかだった。',
      mood: 'neutral',
      nextNodeId: null,
    },
  },
  GOOD: {
    pd01: {
      id: 'pd01',
      speaker: 'nara',
      speakerName: 'ナーラ',
      text: '布を受け取り、ナーラは安堵の息を吐いた。\n\n「だいぶ良くなりました。色ムラもほとんど目立たない。\nこれなら、なんとかなりそうです。」\n\nわずかな濃淡は残るが、実用には十分な仕上がりだ。',
      mood: 'hopeful',
      nextNodeId: 'pd02',
    },
    pd02: {
      id: 'pd02',
      speaker: 'nara',
      speakerName: 'ナーラ',
      text: '「完璧じゃないですけど……これで納品できます。\n温度管理、もう少し厳密にやれば完璧だった。\n勉強になりました。」',
      mood: 'grateful',
      nextNodeId: 'pd03',
    },
    pd03: {
      id: 'pd03',
      speaker: 'narrator',
      speakerName: '——',
      text: 'ナーラは報酬を払い、布を丁寧に畳んだ。\n\n「また来ます。次は失敗しないでみせますから。」\n\n前を向いた彼女の表情に、職人としての矜持が見えた。',
      mood: 'neutral',
      nextNodeId: null,
    },
  },
  PARTIAL: {
    pd01: {
      id: 'pd01',
      speaker: 'nara',
      speakerName: 'ナーラ',
      text: '布を見たナーラの眉が、わずかに下がった。\n\n「まだ、色落ちしそうな部分がありますね……。\n媒染剤の量か、温度が足りなかったのか。\nこれじゃ、洗濯したら色が抜けちゃう。」',
      mood: 'disappointed',
      nextNodeId: 'pd02',
    },
    pd02: {
      id: 'pd02',
      speaker: 'nara',
      speakerName: 'ナーラ',
      text: '「もう一回、やり直せますか？\n今度は自分で温度計見ながらやりますから。\n……よろしくお願いします。」',
      mood: 'tense',
      nextNodeId: 'pd03',
    },
    pd03: {
      id: 'pd03',
      speaker: 'narrator',
      speakerName: '——',
      text: 'ナーラは渋々報酬を払い、布を抱えて戻っていった。\n\nその足取りには、悔しさと、まだ諦めきれない思いが混ざっていた。',
      mood: 'neutral',
      nextNodeId: null,
    },
  },
  DAMAGED: {
    pd01: {
      id: 'pd01',
      speaker: 'nara',
      speakerName: 'ナーラ',
      text: '布を見た瞬間、ナーラの顔から血の気が引いた。\n\n「何これ……！ 色が完全に飛んでる！\n真っ白じゃない……茶色く変色してる……！\nこれじゃ、高かった絹が無駄になる！」',
      mood: 'angry',
      nextNodeId: 'pd02',
    },
    pd02: {
      id: 'pd02',
      speaker: 'nara',
      speakerName: 'ナーラ',
      text: '「沸騰させたんですか！？ カルタミンが熱で分解したんだ！\n媒染以前に、色素そのものが死んでる！\nこれ、弁償してもらえますか！？」',
      mood: 'angry',
      nextNodeId: 'pd03',
    },
    pd03: {
      id: 'pd03',
      speaker: 'narrator',
      speakerName: '——',
      text: 'ナーラは報酬を置かず、布を乱暴に荷車へ放り込んだ。\n\n「二度と、頼みませんからね……！」\n\n悔しさと怒りで震える肩が、夕闇に溶けていった。',
      mood: 'neutral',
      nextNodeId: null,
    },
  },
}

/** エピソード3 納品後・依頼人の反応会話 */
export const ep03PostDelivery: Record<string, Record<string, DialogueNode>> = {
  PERFECT: {
    pd01: {
      id: 'pd01',
      speaker: 'merchant',
      speakerName: '旅の商人',
      text: '樽を揺すり、商人は満足げに頷いた。\n\n「完璧だ。pH 7.0 ちょうど。\n指示薬の色変化も、試験紙の判定も、文句なし。\nこれなら安心して街道を走れる。」',
      mood: 'grateful',
      nextNodeId: 'pd02',
    },
    pd02: {
      id: 'pd02',
      speaker: 'merchant',
      speakerName: '旅の商人',
      text: '「発熱も最小限、二酸化炭素の泡立ちも収まってる。\n重曹の加減と撹拌のタイミング、見事だった。\nプロの仕事を見た気がする。」',
      mood: 'grateful',
      nextNodeId: 'pd03',
    },
    pd03: {
      id: 'pd03',
      speaker: 'narrator',
      speakerName: '——',
      text: '商人は報酬を弾み、樽を荷車に積み直した。\n\n「またこの辺りを通る時は、顔出すよ。\nその時は、もっといい酒持ってくるから。」\n\n颯爽と去っていく荷車の音が、心地よく響いた。',
      mood: 'neutral',
      nextNodeId: null,
    },
  },
  GOOD: {
    pd01: {
      id: 'pd01',
      speaker: 'merchant',
      speakerName: '旅の商人',
      text: '試験紙を確認し、商人は頷いた。\n\n「十分だ。pH 6.8……中性域に入ってる。\n多少の濁りは許容範囲内。輸送に支障はない。」',
      mood: 'hopeful',
      nextNodeId: 'pd02',
    },
    pd02: {
      id: 'pd02',
      speaker: 'merchant',
      speakerName: '旅の商人',
      text: '「重曹の投入、少し早かったかな。\n泡立ちが大きかった分、損失はあったが……\n結果オーライだ。助かったよ。」',
      mood: 'grateful',
      nextNodeId: 'pd03',
    },
    pd03: {
      id: 'pd03',
      speaker: 'narrator',
      speakerName: '——',
      text: '商人は報酬を払い、樽を固定した。\n\n「また頼むかもしれない。\nその時は、もう少し余裕持って来るよ。」\n\n実務的な握手を交わし、彼は旅立っていった。',
      mood: 'neutral',
      nextNodeId: null,
    },
  },
  PARTIAL: {
    pd01: {
      id: 'pd01',
      speaker: 'merchant',
      speakerName: '旅の商人',
      text: '試験紙を見て、商人は眉をひそめた。\n\n「pH 5.5……まだ酸性が残ってる。\nこれだと、輸送中に容器を侵す恐れがある。\nもう一回、重曹を足して確認してくれないか？」',
      mood: 'disappointed',
      nextNodeId: 'pd02',
    },
    pd02: {
      id: 'pd02',
      speaker: 'merchant',
      speakerName: '旅の商人',
      text: '「指示薬の色変化、見逃したのか？\nフェノールフタレインが紅色になるまで入れなきゃ。\n……頼む、あと少しだ。」',
      mood: 'tense',
      nextNodeId: 'pd03',
    },
    pd03: {
      id: 'pd03',
      speaker: 'narrator',
      speakerName: '——',
      text: '商人は渋々報酬の一部を払い、樽を抱えて立ち去った。\n\n「次は自分でやる。\n……指示薬、持って帰るからな。」\n\nその言葉には、プロとしてのプライドと、信頼への未練があった。',
      mood: 'neutral',
      nextNodeId: null,
    },
  },
  DAMAGED: {
    pd01: {
      id: 'pd01',
      speaker: 'merchant',
      speakerName: '旅の商人',
      text: '試験紙を樽に浸け、商人の顔が強張った。\n\n「pH 9.2……アルカリ性に振れすぎだ！\n重曹入れすぎだろ！\nこれじゃ、今度はアルカリ腐食で容器が持たねえ！」',
      mood: 'angry',
      nextNodeId: 'pd02',
    },
    pd02: {
      id: 'pd02',
      speaker: 'merchant',
      speakerName: '旅の商人',
      text: '「中和ってのは、中性にすることだぞ！？\n酸もアルカリも、行き過ぎりゃ毒だ。\nこれで商売道具の樽がいくつダメになると思ってんだ！」',
      mood: 'angry',
      nextNodeId: 'pd03',
    },
    pd03: {
      id: 'pd03',
      speaker: 'narrator',
      speakerName: '——',
      text: '商人は報酬を置かず、樽を引き取っていった。\n\n「二度と、顔も見せねえ方がいい。」\n\n重い荷車の音だけが、テントに残された。',
      mood: 'neutral',
      nextNodeId: null,
    },
  },
}