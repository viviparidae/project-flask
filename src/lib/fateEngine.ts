/**
 * fateEngine.ts — エピソード1「古剣の腐食」因果判定
 *
 * 修復スコアと副産物フラグから処置結果を返す。
 */

export type FateOutcome = {
  grade: 'PERFECT' | 'GOOD' | 'PARTIAL' | 'DAMAGED'
  resultTitle: string
  resultText: string
  trustDelta: number
  reward: number
  reputationNote: string
}

export function judgeRestoration(
  restorationScore: number,
  byproductHazard: boolean,
): FateOutcome {
  // 有毒ガス発生 → 大事故
  if (byproductHazard) {
    return {
      grade: 'DAMAGED',
      resultTitle: '💥 事故発生 — 塩化水素ガス漏出',
      resultText:
        '高濃度塩酸が過熱され、テント内に刺激臭が充満した。\n' +
        'ガルドが咳き込みながら飛び退き、テントの布が変色した。\n' +
        '剣は……かろうじて残ったが、あなたの評判は地に落ちた。\n' +
        '「こんな化学者に頼んだ俺が馬鹿だった……」',
       trustDelta: -50,
       reward: 0,
       reputationNote: '近隣住民の警戒度が大幅に上昇した',
    }
  }

  if (restorationScore >= 80) {
    return {
      grade: 'PERFECT',
      resultTitle: '✨ 完全修復 — 神業の腐食除去',
      resultText:
        '酸洗浄液が静かに腐食を溶かしていく。\n' +
        '数十分後、黒い膜が完全に剥がれ落ち、鋼の輝きが蘇った。\n' +
        'ガルドは剣を光にかざし、しばらく言葉を失っていた。\n' +
        '「……親父の顔が、刃に映っている。ありがとう。」\n' +
        '鍛冶師の目に、光るものが見えた。',
      trustDelta: 35,
      reward: 280,
      reputationNote: '「荒野の化学者」として鍛冶師組合に名が知られた',
    }
  }

  if (restorationScore >= 55) {
    return {
      grade: 'GOOD',
      resultTitle: '🗡️ 良好な修復',
      resultText:
        '大部分の腐食が除去され、剣の輪郭と刃紋が姿を現した。\n' +
        'わずかに残った痕跡が気になるが、実用には十分な状態だ。\n' +
        '「完璧じゃないが……これだけ戻れば上等だ。助かった。」',
       trustDelta: 10,
       reward: 160,
       reputationNote: '信頼できる技術者として口コミが広まった',
    }
  }

  if (restorationScore >= 25) {
    return {
      grade: 'PARTIAL',
      resultTitle: '⚠️ 修復不完全 — 腐食残存',
      resultText:
        '腐食の一部は除去されたが、深部の錆には届かなかった。\n' +
        '処理を繰り返せば改善できるが、今回は力不足だった。\n' +
        '「……もう少しかと思ったが。まあ、またやり直せるか。」\n' +
        'ガルドの表情は複雑だ。',
       trustDelta: 2,
       reward: 60,
       reputationNote: '',
    }
  }

   return {
     grade: 'DAMAGED',
     resultTitle: '💀 失敗 — 金属侵食',
     resultText:
       '処理液が腐食だけでなく、金属母材まで攻撃してしまった。\n' +
       '刃の表面が白く荒れ、エッジが丸まっている。\n' +
       '「何をしてくれた……！ これじゃ使い物にならない！」\n' +
       'ガルドが激怒した。あなたは言葉を失った。',
     trustDelta: -50,
     reward: 0,
     reputationNote: '鍛冶師組合から警告を受けた',
   }
}
