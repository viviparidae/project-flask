import Phaser from 'phaser'
import type { FateOutcome } from '../../lib/fateEngine'

/**
 * ResultScene — 処置結果表示フェーズ
 * 判定結果（等級・物語・ステータス変化）を表示 → タップで次の対話へ
 */
export class ResultScene extends Phaser.Scene {
  private outcome!: FateOutcome
  private reaction!: any
  private attempt!: any
  private state!: any

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: { outcome: FateOutcome; reaction: any; attempt: any }) {
    this.outcome = data.outcome
    this.reaction = data.reaction
    this.attempt = data.attempt
  }

  create() {
    this.state = this.game.registry.get('gameState')
    const { width, height } = this.scale

    // 背景色を結果に応じて変更
    const isGood = this.outcome.grade === 'PERFECT' || this.outcome.grade === 'GOOD'
    this.cameras.main.setBackgroundColor(isGood ? '#0f2a1a' : '#2a0f0f')

    // 背景エフェクト
    this.drawBackgroundEffect(isGood)

    // 等級バッジ
    this.createGradeBadge()

    // 結果タイトル
    this.add.text(width / 2, 200, this.outcome.resultTitle, {
      fontSize: '28px',
      color: isGood ? '#65e6ad' : '#f87171',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5)

    // 結果物語テキスト
    const storyText = this.add.text(width / 2, 270, this.outcome.resultText, {
      fontSize: '18px',
      color: '#e0e0e0',
      fontFamily: 'system-ui, sans-serif',
      lineSpacing: 10,
      align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5)

    // 評判・報酬変化
    this.createStatChanges()

    // 次へボタン
    this.createNextButton()

    // タッチで次へ
    this.input.on('pointerdown', this.goToNextDialogue, this)

    // リサイズ対応
    this.scale.on('resize', this.onResize, this)
  }

  private drawBackgroundEffect(isGood: boolean) {
    const { width, height } = this.scale
    const graphics = this.add.graphics()

    if (isGood) {
      // 成功：緑系パーティクル風
      graphics.fillStyle(0x65e6ad, 0.1)
      for (let i = 0; i < 30; i++) {
        const x = Phaser.Math.Between(0, width)
        const y = Phaser.Math.Between(0, height)
        const r = Phaser.Math.Between(2, 8)
        graphics.fillCircle(x, y, r)
      }
      // 中央グロー
      graphics.fillStyle(0x65e6ad, 0.05)
      graphics.fillCircle(width / 2, height / 2, 300)
    } else {
      // 失敗：赤系
      graphics.fillStyle(0xf87171, 0.1)
      for (let i = 0; i < 20; i++) {
        const x = Phaser.Math.Between(0, width)
        const y = Phaser.Math.Between(0, height)
        const r = Phaser.Math.Between(3, 10)
        graphics.fillCircle(x, y, r)
      }
      graphics.fillStyle(0xf87171, 0.05)
      graphics.fillCircle(width / 2, height / 2, 300)
    }
  }

  private createGradeBadge() {
    const { width } = this.scale
    const grade = this.outcome.grade

    const gradeConfig: Record<string, { emoji: string; color: number }> = {
      PERFECT: { emoji: '✨', color: 0x65e6ad },
      GOOD: { emoji: '🗡️', color: 0x8bcfef },
      PARTIAL: { emoji: '⚠️', color: 0xf6c94e },
      DAMAGED: { emoji: '💀', color: 0xf87171 },
    }

    const cfg = gradeConfig[grade] || { emoji: '❓', color: 0x888888 }

    const container = this.add.container(width / 2, 120)

    const bg = this.add.graphics()
    bg.fillStyle(cfg.color, 0.2)
    bg.fillRoundedRect(-100, -40, 200, 80, 20)
    bg.lineStyle(3, cfg.color, 1)
    bg.strokeRoundedRect(-100, -40, 200, 80, 20)

    const emoji = this.add.text(0, -10, cfg.emoji, { fontSize: '48px' }).setOrigin(0.5)
    const label = this.add.text(0, 28, grade, {
      fontSize: '24px',
      color: '#' + cfg.color.toString(16).padStart(6, '0'),
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    container.add([bg, emoji, label])

    // ポップインアニメーション
    container.setScale(0)
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 400,
      ease: 'Back.Out',
    })
  }

  private createStatChanges() {
    const { width } = this.scale
    const state = this.state

    const panelY = 480
    const panelWidth = width - 80

    // パネル背景
    const bg = this.add.graphics()
    bg.fillStyle(0x16213e, 0.9)
    bg.fillRoundedRect(40, panelY - 20, panelWidth, 140, 12)
    bg.lineStyle(1, 0x3d4a5c, 0.5)
    bg.strokeRoundedRect(40, panelY - 20, panelWidth, 140, 12)

    // 評判変化
    const trustColor = this.outcome.trustDelta >= 0 ? '#65e6ad' : '#f87171'
    const trustSign = this.outcome.trustDelta >= 0 ? '+' : ''

    this.add.text(width / 2 - 120, panelY, '評判', {
      fontSize: '16px',
      color: '#8899aa',
      fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    this.add.text(width / 2 - 120, panelY + 35, `${trustSign}${this.outcome.trustDelta} → ${state.trust}`, {
      fontSize: '24px',
      color: trustColor,
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // 区切り線
    const line = this.add.graphics()
    line.lineStyle(1, 0x3d4a5c, 0.5)
    line.beginPath()
    line.moveTo(width / 2, panelY + 5)
    line.lineTo(width / 2, panelY + 105)
    line.strokePath()

    // 報酬
    const rewardColor = this.outcome.reward > 0 ? '#f6c94e' : '#f87171'
    this.add.text(width / 2 + 120, panelY, '報酬', {
      fontSize: '16px',
      color: '#8899aa',
      fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    this.add.text(width / 2 + 120, panelY + 35, `+${this.outcome.reward}G → ${state.gold}G`, {
      fontSize: '24px',
      color: rewardColor,
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // 評判メモ
    if (this.outcome.reputationNote) {
      this.add.text(width / 2, panelY + 85, `📣 ${this.outcome.reputationNote}`, {
        fontSize: '13px',
        color: '#8bcfef',
        fontFamily: 'system-ui, sans-serif',
        align: 'center',
        wordWrap: { width: panelWidth - 40 },
      }).setOrigin(0.5)
    }
  }

  private createNextButton() {
    const { width, height } = this.scale
    const state = this.state

    const btn = this.add.container(width / 2, height - state.safeArea.bottom - 80)

    const bg = this.add.graphics()
    bg.fillStyle(0x3d4a5c, 1)
    bg.fillRoundedRect(-120, -30, 240, 60, 12)

    const text = this.add.text(0, 0, '次の依頼を待つ →', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    btn.add([bg, text])
    btn.setSize(240, 60)

    const hitArea = new Phaser.Geom.Rectangle(-120, -30, 240, 60)
    btn.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => {
        btn.setAlpha(0.7)
        this.goToNextDialogue()
      })
      .on('pointerup', () => btn.setAlpha(1))
      .on('pointerout', () => btn.setAlpha(1))
      .on('pointerover', () => {})
  }

  private goToNextDialogue() {
    this.input.off('pointerdown', this.goToNextDialogue, this)
    this.scene.start('DialogueScene')
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    const state = this.game.registry.get('gameState')
    state.updateSafeArea(gameSize.width, gameSize.height)
  }

  shutdown() {
    this.scale.off('resize', this.onResize, this)
    this.input.off('pointerdown', this.goToNextDialogue, this)
  }
}