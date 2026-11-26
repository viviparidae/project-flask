import Phaser from 'phaser'
import { GameState } from '../state/GameState'
import { recordReaction, recordCrafted, autoRecordStageNotes, advanceRoadmapStage, type KnowledgeState, createInitialKnowledgeState } from '../../lib/knowledge'

/**
 * DayEndScene — 夜の振り返り画面
 * その日の記録（作ったもの、聞いた話、依頼人の反応）が知識ノートに残る
 */
export class DayEndScene extends Phaser.Scene {
  private state!: GameState
  private knowledgeState!: KnowledgeState
  private bgGraphics!: Phaser.GameObjects.Graphics
  private nextButton!: Phaser.GameObjects.Container

  constructor() {
    super({ key: 'DayEndScene' })
  }

  init(data: { gameState: GameState; knowledgeState: KnowledgeState }) {
    this.state = data.gameState
    this.knowledgeState = data.knowledgeState
  }

  create() {
    const { width, height } = this.scale
    const state = this.state

    // 背景
    this.bgGraphics = this.add.graphics()
    this.drawBackground()

    // タイトル
    this.add.text(width / 2, state.safeArea.top + 40, `第${state.currentDay}日 ふりかえり`, {
      fontSize: '28px',
      color: '#facc15',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // 今日の依頼人リスト
    this.renderClientSummary(width, height, state)

    // 知識ノートへの記録内容
    this.renderKnowledgeRecord(width, height, state)

    // 次へボタン
    this.nextButton = this.createNextButton()
    this.positionNextButton()

    // タッチで次へ
    this.input.on('pointerdown', this.goToNextDay, this)

    // リサイズ対応
    this.scale.on('resize', this.onResize, this)
  }

  private drawBackground() {
    const { width, height } = this.scale
    this.bgGraphics.clear()
    this.bgGraphics.fillGradientStyle(0x0f0f1a, 0x0f0f1a, 0x1a1a2e, 0x1a1a2e, 1)
    this.bgGraphics.fillRect(0, 0, width, height)
    // 星空風の点
    this.bgGraphics.fillStyle(0x3d4a5c, 0.3)
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width)
      const y = Phaser.Math.Between(0, height)
      const r = Phaser.Math.Between(1, 3)
      this.bgGraphics.fillCircle(x, y, r)
    }
  }

  private renderClientSummary(width: number, height: number, state: GameState) {
    const startY = state.safeArea.top + 100
    const panelWidth = width - 80
    const panelX = 40

    state.completedClients.forEach((clientId, index) => {
      const y = startY + index * 140
      const result = this.getClientResult(clientId)
      const clientName = this.getClientName(clientId)

      // パネル背景
            const bg = this.add.graphics()
            bg.fillStyle(0x16213e, 0.95)
            bg.fillRoundedRect(panelX, y - 10, panelWidth, 130, 12)
            bg.lineStyle(1.5, this.getResultColor(result), 0.8)
            bg.strokeRoundedRect(panelX, y - 10, panelWidth, 130, 12)

      // 依頼人名・結果
      this.add.text(panelX + 20, y + 5, `${clientName} — ${this.getResultLabel(result)}`, {
        fontSize: '18px',
        color: this.getResultColorHex(result),
        fontFamily: 'system-ui, sans-serif',
        fontStyle: 'bold',
      })

      // 結果詳細
      const detailText = this.getResultDetail(clientId, result)
      this.add.text(panelX + 20, y + 35, detailText, {
        fontSize: '14px',
        color: '#cbd5e1',
        fontFamily: 'system-ui, sans-serif',
        wordWrap: { width: panelWidth - 40 },
      })

      // 評判・報酬変化
      const delta = this.getTrustDelta(clientId, result)
      const reward = this.getReward(clientId, result)
      const trustColor = delta >= 0 ? '#4ade80' : '#f87171'
      const trustSign = delta >= 0 ? '+' : ''

      this.add.text(panelX + 20, y + 70, `評判: ${trustSign}${delta}`, {
        fontSize: '13px',
        color: trustColor,
        fontFamily: 'system-ui, sans-serif',
      })

      this.add.text(panelX + 180, y + 70, `報酬: +${reward}G`, {
        fontSize: '13px',
        color: '#f6c94e',
        fontFamily: 'system-ui, sans-serif',
      })

      // 分析タグ表示
      const tags = this.getAnalysisTagsForClient(clientId)
      if (tags.length > 0) {
        this.add.text(panelX + 20, y + 95, `分析: ${tags.join('、')}`, {
          fontSize: '12px',
          color: '#8bcfef',
          fontFamily: 'system-ui, sans-serif',
          fontStyle: 'italic',
          wordWrap: { width: panelWidth - 40 },
        })
      }
    })
  }

  private renderKnowledgeRecord(width: number, height: number, state: GameState) {
    const startY = state.safeArea.top + 100 + state.completedClients.length * 140 + 20
    const panelWidth = width - 80
    const panelX = 40

    // 今日の作成品目
    const craftedToday = this.knowledgeState.crafted.filter(c => c.episodeId.startsWith('ep0'))
    if (craftedToday.length > 0) {
      const y = startY
      const bg = this.add.graphics()
      bg.fillStyle(0x16213e, 0.9)
      bg.fillRoundedRect(panelX, y - 10, panelWidth, 100, 12)
      bg.lineStyle(1, 0x65e6ad, 0.5)
      bg.strokeRoundedRect(panelX, y - 10, panelWidth, 100, 12)

      this.add.text(panelX + 20, y + 5, '📝 今日の記録', {
        fontSize: '16px',
        color: '#65e6ad',
        fontFamily: 'system-ui, sans-serif',
        fontStyle: 'bold',
      })

      craftedToday.forEach((craft, idx) => {
        const tierColor = this.getQualityTierColor(craft.qualityTier)
        this.add.text(panelX + 20, y + 30 + idx * 22, `・${craft.recipeName} — ${this.getQualityTierLabel(craft.qualityTier)}`, {
          fontSize: '13px',
          color: tierColor,
          fontFamily: 'system-ui, sans-serif',
        })
      })
    }

    // 依頼人の反応記録
    const reactionsToday = this.knowledgeState.reactions.filter(r => r.episodeId.startsWith('ep0'))
    if (reactionsToday.length > 0) {
      const y = startY + (craftedToday.length > 0 ? 110 : 0)
      const bg = this.add.graphics()
      bg.fillStyle(0x16213e, 0.9)
      bg.fillRoundedRect(panelX, y - 10, panelWidth, reactionsToday.length * 30 + 30, 12)
      bg.lineStyle(1, 0x8bcfef, 0.5)
      bg.strokeRoundedRect(panelX, y - 10, panelWidth, reactionsToday.length * 30 + 30, 12)

      this.add.text(panelX + 20, y + 5, '💬 依頼人の言葉', {
        fontSize: '16px',
        color: '#8bcfef',
        fontFamily: 'system-ui, sans-serif',
        fontStyle: 'bold',
      })

      reactionsToday.forEach((reaction, idx) => {
        this.add.text(panelX + 20, y + 30 + idx * 30, `「${reaction.summary}」`, {
          fontSize: '12px',
          color: '#94a3b8',
          fontFamily: 'system-ui, sans-serif',
          fontStyle: 'italic',
          wordWrap: { width: panelWidth - 40 },
        })
      })
    }

    // ロードマップ進行
    const y = startY + (craftedToday.length > 0 ? 110 : 0) + reactionsToday.length * 30 + 30
    const roadmapStage = this.getRoadmapStageInfo(this.knowledgeState.currentRoadmapStage)
    if (roadmapStage) {
      const bg = this.add.graphics()
      bg.fillStyle(0x16213e, 0.9)
      bg.fillRoundedRect(panelX, y - 10, panelWidth, 80, 12)
      bg.lineStyle(1, 0xfacc15, 0.5)
      bg.strokeRoundedRect(panelX, y - 10, panelWidth, 80, 12)

      this.add.text(panelX + 20, y + 5, `🗺️ ロードマップ: ${roadmapStage.title}`, {
        fontSize: '15px',
        color: '#facc15',
        fontFamily: 'system-ui, sans-serif',
        fontStyle: 'bold',
      })
      this.add.text(panelX + 20, y + 30, roadmapStage.description, {
        fontSize: '12px',
        color: '#cbd5e1',
        fontFamily: 'system-ui, sans-serif',
        wordWrap: { width: panelWidth - 40 },
      })
      if (roadmapStage.nextPreview) {
        this.add.text(panelX + 20, y + 55, `次: ${roadmapStage.nextPreview.title} — ${roadmapStage.nextPreview.hint}`, {
          fontSize: '11px',
          color: '#8bcfef',
          fontFamily: 'system-ui, sans-serif',
          fontStyle: 'italic',
          wordWrap: { width: panelWidth - 40 },
        })
      }
    }
  }

  private createNextButton(): Phaser.GameObjects.Container {
    const { width, height } = this.scale
    const state = this.state

    const container = this.add.container(0, 0)
    const bg = this.add.graphics()
    bg.fillStyle(0x2d6a4f, 1)
    bg.fillRoundedRect(-120, -30, 240, 60, 12)

    const text = this.add.text(0, 0, '翌朝へ →', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    container.add([bg, text])
    container.setSize(240, 60)

    const hitArea = new Phaser.Geom.Rectangle(-120, -30, 240, 60)
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => {
        container.setAlpha(0.7)
        this.goToNextDay()
      })
      .on('pointerup', () => container.setAlpha(1))
      .on('pointerout', () => container.setAlpha(1))

    return container
  }

  private positionNextButton() {
    const { width, height } = this.scale
    const state = this.state
    this.nextButton.setPosition(width / 2, height - state.safeArea.bottom - 60)
  }

  private goToNextDay() {
    this.input.off('pointerdown', this.goToNextDay, this)
    // 知識ノートに自動記録（次の段階のノートなど）
    autoRecordStageNotes(this.knowledgeState, this.knowledgeState.currentRoadmapStage)
    // ロードマップ段階を進める（次の段階へ）
    if (this.knowledgeState.currentRoadmapStage < 6) {
      advanceRoadmapStage(this.knowledgeState, this.knowledgeState.currentRoadmapStage + 1)
    }
    // 日の終わり完了
    this.state.completeDayEnd()
    // 次の日の初期化
    this.state.initializeDay()
    // 最初の依頼人の会話へ
    this.scene.start('DialogueScene')
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    const state = this.game.registry.get('gameState')
    state.updateSafeArea(gameSize.width, gameSize.height)
    this.bgGraphics.clear()
    this.drawBackground()
    this.positionNextButton()
  }

  // ヘルパー関数
  private getClientResult(clientId: string): string {
    switch (clientId) {
      case 'ep01': return this.state.ep01Result || 'DAMAGED'
      case 'ep02': return this.state.ep02Result || 'DAMAGED'
      case 'ep03': return this.state.ep03Result || 'DAMAGED'
      default: return 'DAMAGED'
    }
  }

  private getClientName(clientId: string): string {
    switch (clientId) {
      case 'ep01': return 'ガルド'
      case 'ep02': return 'ナーラ'
      case 'ep03': return '旅の商人'
      default: return '不明'
    }
  }

  private getResultLabel(result: string): string {
    const labels: Record<string, string> = {
      PERFECT: '✨ 完全修復',
      GOOD: '🗡️ 良好',
      PARTIAL: '⚠️ 不完全',
      DAMAGED: '💀 失敗',
    }
    return labels[result] || result
  }

  private getResultColor(result: string): number {
    const colors: Record<string, number> = {
      PERFECT: 0x65e6ad,
      GOOD: 0x8bcfef,
      PARTIAL: 0xf6c94e,
      DAMAGED: 0xf87171,
    }
    return colors[result] || 0x888888
  }

  private getResultColorHex(result: string): string {
    const colors: Record<string, string> = {
      PERFECT: '#4ade80',
      GOOD: '#38bdf8',
      PARTIAL: '#facc15',
      DAMAGED: '#f87171',
    }
    return colors[result] || '#888888'
  }

  private getResultDetail(clientId: string, result: string): string {
    const details: Record<string, Record<string, string>> = {
      ep01: {
        PERFECT: '親父の顔が刃に映っていた。完璧な腐食除去。',
        GOOD: '大分違うな。これなら実戦で使える。わずかな痕跡が残る。',
        PARTIAL: 'まだ深いところの錆が残ってる。もう一回やり直せるか？',
        DAMAGED: '何をしてくれた！親父の形見が台無しだ！',
      },
      ep02: {
        PERFECT: '色が鮮やかに定着した！これで商品になる。',
        GOOD: 'だいぶ良くなった。あと少し調整すれば完璧だ。',
        PARTIAL: 'まだ色ムラがある。媒染剤の加減が足りなかったか。',
        DAMAGED: '色が完全に飛んでしまった。これじゃ売り物にならない。',
      },
      ep03: {
        PERFECT: '中和完璧だ。これで安全に運べる。',
        GOOD: '十分だ。多少の濁りは許容範囲内。',
        PARTIAL: 'まだ酸性が残ってる。もう一回確認してくれ。',
        DAMAGED: '中和不十分！輸送中に容器が溶ける危険がある！',
      },
    }
    return details[clientId]?.[result] || '記録なし'
  }

  private getTrustDelta(clientId: string, result: string): number {
    const deltas: Record<string, Record<string, number>> = {
      ep01: { PERFECT: 35, GOOD: 18, PARTIAL: 3, DAMAGED: -30 },
      ep02: { PERFECT: 25, GOOD: 12, PARTIAL: 2, DAMAGED: -20 },
      ep03: { PERFECT: 15, GOOD: 8, PARTIAL: 1, DAMAGED: -10 },
    }
    return deltas[clientId]?.[result] || 0
  }

  private getReward(clientId: string, result: string): number {
    const rewards: Record<string, Record<string, number>> = {
      ep01: { PERFECT: 280, GOOD: 160, PARTIAL: 60, DAMAGED: 0 },
      ep02: { PERFECT: 200, GOOD: 120, PARTIAL: 40, DAMAGED: 0 },
      ep03: { PERFECT: 100, GOOD: 60, PARTIAL: 20, DAMAGED: 0 },
    }
    return rewards[clientId]?.[result] || 0
  }

  private getAnalysisTagsForClient(clientId: string): string[] {
    const tags: Record<string, string[]> = {
      ep01: ['黒錆', '塩化物錆', '出自'],
      ep02: ['植物色素', '媒染剤', 'pH調整'],
      ep03: ['酸塩基中和', '指示薬'],
    }
    return tags[clientId] || []
  }

  private getQualityTierLabel(tier: string): string {
    const labels: Record<string, string> = {
      perfect: '完璧',
      good: '良好',
      partial: '部分的',
      failed: '失敗',
    }
    return labels[tier] || tier
  }

  private getQualityTierColor(tier: string): string {
    const colors: Record<string, string> = {
      perfect: '#4ade80',
      good: '#38bdf8',
      partial: '#facc15',
      failed: '#f87171',
    }
    return colors[tier] || '#888888'
  }

  private getRoadmapStageInfo(stage: number) {
    const stages = [
      { title: '第0段 旅の始まり', description: '仮設テントと基礎試薬だけで始まる。', nextPreview: { title: '第1段 酸と錆の基礎', hint: '港町の鍛冶師が父の形見の古剣を持って訪れる。' } },
      { title: '第1段 酸と錆の基礎', description: '黒錆と塩化物錆の見分け、リン酸による除去を身につけた。', nextPreview: { title: '第2段 染料と液の相性', hint: '染料職人が色落ちの相談に来る。' } },
      { title: '第2段 染料と液の相性', description: '媒染剤と植物色素、pHによる色の変化を得た。', nextPreview: { title: '第3段 目に見えない粒（イオン）', hint: '井戸水の異常を調べる依頼。' } },
      { title: '第3段 目に見えない粒（イオン）', description: '水質検査と蒸留、沈殿反応でイオンを分離検出する。', nextPreview: { title: '第4段 弱い酸でも加減を誤れば傷む', hint: '貴族のパーティー用調合。' } },
      { title: '第4段 弱い酸でも加減を誤れば傷む', description: '弱酸・弱塩基、指示薬、緩衝液で精密な濃度制御が可能に。', nextPreview: { title: '第5段 混ざりものが少ないほど薬は正直に効く', hint: '熱病の集落で薬を作る依頼。' } },
      { title: '第5段 混ざりものが少ないほど薬は正直に効く', description: '触媒、純度計算、合成経路で薬としての品質を設計できる。', nextPreview: { title: '第6段 薬も毒も、量で決まる', hint: '薬をめぐる倫理的判断。' } },
      { title: '第6段 薬も毒も、量で決まる', description: '用量概念、毒性試験、倫理的判断で薬としての責任ある扱いができる。', nextPreview: undefined },
    ]
    return stages[stage]
  }

  shutdown() {
    this.scale.off('resize', this.onResize, this)
    this.input.off('pointerdown', this.goToNextDay, this)
  }
}