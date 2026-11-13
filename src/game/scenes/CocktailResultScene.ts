import Phaser from 'phaser'
import { GameState } from '../state/GameState'
import type { MatchResult, CocktailRecipe, FlavorProfile, CustomerOrder, ShakerState } from '../../lib/cocktailEngine'

type ResultSceneData = {
  outcome: MatchResult
  profile: FlavorProfile | null
  order: CustomerOrder
  shaker: ShakerState
  gameState: GameState
}

/**
 * CocktailResultScene — カクテル提供結果表示
 * VA-11 Hall-A 風：客の反応・チップ・好感度変化
 */
export class CocktailResultScene extends Phaser.Scene {
  private resultData!: ResultSceneData
  private state!: GameState

  constructor() {
    super({ key: 'CocktailResultScene' })
  }

  init(data: ResultSceneData) {
    this.resultData = data
    this.state = data.gameState
  }

  create() {
    const { width, height } = this.scale
    const { outcome, profile, order, shaker } = this.resultData

    // 背景色を結果に応じて変更
    const isGood = outcome.grade === 'PERFECT' || outcome.grade === 'GOOD'
    this.cameras.main.setBackgroundColor(isGood ? '#0f2a1a' : '#2a0f0f')

    this.drawBackgroundEffect(isGood)

    // 等級バッジ
    this.createGradeBadge(width)

    // 結果タイトル
    this.add.text(width / 2, 180, outcome.recipe?.name || '謎の液体', {
      fontSize: '28px',
      color: isGood ? '#65e6ad' : '#f87171',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5)

    // 客の反応テキスト
    const reactionText = this.getReactionText(outcome, order)
    this.add.text(width / 2, 240, reactionText, {
      fontSize: '18px',
      color: '#e0e0e0',
      fontFamily: 'system-ui, sans-serif',
      lineSpacing: 10,
      align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5)

    // カクテル詳細（作ったものの構成）
    this.createCocktailDetails(width, 340, profile, shaker)

    // 評価・報酬変化
    this.createStatChanges(width, 480, outcome)

    // 次へボタン
    this.createNextButton(width, height)

    // タッチで次へ
    this.input.on('pointerdown', this.goToNext, this)

    this.scale.on('resize', this.onResize, this)
  }

  private drawBackgroundEffect(isGood: boolean) {
    const { width, height } = this.scale
    const graphics = this.add.graphics()

    if (isGood) {
      graphics.fillStyle(0x65e6ad, 0.1)
      for (let i = 0; i < 30; i++) {
        graphics.fillCircle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), Phaser.Math.Between(2, 8))
      }
      graphics.fillStyle(0x65e6ad, 0.05)
      graphics.fillCircle(width / 2, height / 2, 300)
    } else {
      graphics.fillStyle(0xf87171, 0.1)
      for (let i = 0; i < 20; i++) {
        graphics.fillCircle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), Phaser.Math.Between(3, 10))
      }
      graphics.fillStyle(0xf87171, 0.05)
      graphics.fillCircle(width / 2, height / 2, 300)
    }
  }

  private createGradeBadge(width: number) {
    const grade = this.resultData.outcome.grade

    const gradeConfig: Record<string, { emoji: string; color: number; label: string }> = {
      PERFECT: { emoji: '✨', color: 0x65e6ad, label: 'PERFECT' },
      GOOD: { emoji: '👍', color: 0x8bcfef, label: 'GOOD' },
      FAIL: { emoji: '💀', color: 0xf87171, label: 'FAIL' },
    }

    const cfg = gradeConfig[grade] || { emoji: '❓', color: 0x888888, label: grade }

    const container = this.add.container(width / 2, 80)

    const bg = this.add.graphics()
    bg.fillStyle(cfg.color, 0.2)
    bg.fillRoundedRect(-100, -40, 200, 80, 20)
    bg.lineStyle(3, cfg.color, 1)
    bg.strokeRoundedRect(-100, -40, 200, 80, 20)

    const emoji = this.add.text(0, -10, cfg.emoji, { fontSize: '48px' }).setOrigin(0.5)
    const label = this.add.text(0, 28, cfg.label, {
      fontSize: '24px',
      color: '#' + cfg.color.toString(16).padStart(6, '0'),
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    container.add([bg, emoji, label])

    container.setScale(0)
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 400,
      ease: 'Back.Out',
    })
  }

  private getReactionText(outcome: MatchResult, order: CustomerOrder): string {
    const reactions: Record<'PERFECT'|'GOOD'|'FAIL', string[]> = {
      PERFECT: [
        `「おお……これだ。まさに望んでいた味だ。」`,
        `${order.customerName}はグラスを空にし、満足げにため息をついた。`,
        `「また来る。その時は……また同じのを頼む。」`,
      ],
      GOOD: [
        `「悪くない。及第点だ。」`,
        `${order.customerName}は黙って飲み干し、グラスを置いた。`,
        `「次はもっと上を期待してるぞ。」`,
      ],
      FAIL: [
        `「……なんだこれは。」`,
        `${order.customerName}は一口飲んで、眉をひそめた。`,
        `「作り直せ。金は払わん。」`,
      ],
    }
    return reactions[outcome.grade].join('\\n\\n')
  }

  private createCocktailDetails(width: number, startY: number, profile: FlavorProfile | null, shaker: ShakerState) {
    if (!profile) return

    const panelY = startY
    const panelWidth = width - 80

    // パネル背景
    const bg = this.add.graphics()
    bg.fillStyle(0x16213e, 0.9)
    bg.fillRoundedRect(40, panelY - 10, panelWidth, 130, 12)
    bg.lineStyle(1, 0x3d4a5c, 0.5)
    bg.strokeRoundedRect(40, panelY - 10, panelWidth, 130, 12)

    // タイトル
    this.add.text(width / 2, panelY, '提供したカクテルの構成', {
      fontSize: '14px', color: '#8899aa', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)

    // 液体色プレビュー
    const colorX = 80
    const colorY = panelY + 35
    const colorPreview = this.add.graphics()
    colorPreview.fillStyle(parseInt(profile.color.replace('#', ''), 16), 1)
    colorPreview.fillCircle(colorX, colorY, 20)
    colorPreview.lineStyle(2, 0xffffff, 0.3)
    colorPreview.strokeCircle(colorX, colorY, 20)

    // 構成テキスト
    let composition = ''
    for (const [base, count] of Object.entries(shaker.baseCounts)) {
      if (count > 0) composition += `${INGREDIENT_LABELS[base as keyof typeof INGREDIENT_LABELS]}×${count}  `
    }
    for (const [add, count] of Object.entries(shaker.additiveCounts)) {
      if (count > 0) composition += `${INGREDIENT_LABELS[add as keyof typeof INGREDIENT_LABELS]}×${count}  `
    }
    if (shaker.mixed) composition += '🌀混ぜた  '
    if (shaker.aged) composition += `⏳熟成${shaker.ageTime}s  `

    this.add.text(colorX + 35, colorY, composition, {
      fontSize: '13px', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif',
      wordWrap: { width: panelWidth - 80 },
    }).setOrigin(0, 0.5)

    // 味覚プロファイルバー
    this.drawProfileBars(width / 2, panelY + 70, profile)
  }

  private drawProfileBars(centerX: number, y: number, profile: FlavorProfile) {
    const bars = [
      { label: '度数', value: profile.abv, max: 80, color: '#f87171' },
      { label: '甘味', value: profile.sweetness, max: 100, color: '#ff6b9d' },
      { label: '酸味', value: profile.sourness, max: 100, color: '#ffd700' },
      { label: '苦味', value: profile.bitterness, max: 100, color: '#8b4513' },
    ]

    bars.forEach((bar, i) => {
      const bx = centerX - 200 + i * 100
      const by = y

      this.add.text(bx, by - 18, bar.label, {
        fontSize: '11px', color: '#8899aa', fontFamily: 'system-ui, sans-serif',
      }).setOrigin(0.5)

      const barBg = this.add.graphics()
      barBg.fillStyle(0x1a1a2e, 1)
      barBg.fillRoundedRect(bx - 35, by - 6, 70, 12, 6)

      const fillW = Math.max(0, 68 * (bar.value / bar.max))
      const barFill = this.add.graphics()
      barFill.fillStyle(parseInt(bar.color.replace('#', ''), 16), 1)
      barFill.fillRoundedRect(bx - 34, by - 5, fillW, 10, 5)

      this.add.text(bx, by + 18, String(bar.value), {
        fontSize: '12px', color: bar.color, fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
      }).setOrigin(0.5)
    })
  }

  private createStatChanges(width: number, startY: number, outcome: MatchResult) {
    const panelY = startY
    const panelWidth = width - 80

    const trustDelta = this.getTrustDelta(outcome)
    const reward = this.getReward(outcome)

    // パネル背景
    const bg = this.add.graphics()
    bg.fillStyle(0x16213e, 0.9)
    bg.fillRoundedRect(40, panelY - 10, panelWidth, 120, 12)
    bg.lineStyle(1, 0x3d4a5c, 0.5)
    bg.strokeRoundedRect(40, panelY - 10, panelWidth, 120, 12)

    // チップ/報酬
    const trustColor = trustDelta >= 0 ? '#65e6ad' : '#f87171'
    const trustSign = trustDelta >= 0 ? '+' : ''

    this.add.text(width / 2 - 120, panelY, 'チップ', {
      fontSize: '16px', color: '#8899aa', fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    this.add.text(width / 2 - 120, panelY + 35, `${trustSign}${trustDelta}G → ${this.state.gold + reward}G`, {
      fontSize: '24px', color: trustColor, fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)

    // 区切り線
    const line = this.add.graphics()
    line.lineStyle(1, 0x3d4a5c, 0.5)
    line.beginPath()
    line.moveTo(width / 2, panelY + 5)
    line.lineTo(width / 2, panelY + 95)
    line.strokePath()

    // 好感度/評判
    const repDelta = this.getReputationDelta(outcome)
    const repColor = repDelta >= 0 ? '#65e6ad' : '#f87171'
    const repSign = repDelta >= 0 ? '+' : ''

    this.add.text(width / 2 + 120, panelY, '評判', {
      fontSize: '16px', color: '#8899aa', fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    this.add.text(width / 2 + 120, panelY + 35, `${repSign}${repDelta} → ${this.state.trust + repDelta}`, {
      fontSize: '24px', color: repColor, fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)

    // 客のセリフ（フィードバック）
    this.add.text(width / 2, panelY + 75, `💬 "${outcome.feedback}"`, {
      fontSize: '13px', color: '#8bcfef', fontFamily: 'system-ui, sans-serif',
      align: 'center', wordWrap: { width: panelWidth - 40 },
    }).setOrigin(0.5)
  }

  private getTrustDelta(outcome: MatchResult): number {
    switch (outcome.grade) {
      case 'PERFECT': return 500
      case 'GOOD': return 200
      case 'FAIL': return 0
    }
  }

  private getReward(outcome: MatchResult): number {
    switch (outcome.grade) {
      case 'PERFECT': return 500
      case 'GOOD': return 200
      case 'FAIL': return 0
    }
  }

  private getReputationDelta(outcome: MatchResult): number {
    switch (outcome.grade) {
      case 'PERFECT': return 15
      case 'GOOD': return 5
      case 'FAIL': return -20
    }
  }

  private createNextButton(width: number, height: number) {
    const btn = this.add.container(width / 2, height - this.state.safeArea.bottom - 80)

    const bg = this.add.graphics()
    bg.fillStyle(0x3d4a5c, 1)
    bg.fillRoundedRect(-140, -30, 280, 60, 12)

    const text = this.add.text(0, 0, '次の客を待つ →', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    btn.add([bg, text])
    btn.setSize(280, 60)

    const hitArea = new Phaser.Geom.Rectangle(-140, -30, 280, 60)
    btn.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => { btn.setAlpha(0.7); this.goToNext() })
      .on('pointerup', () => btn.setAlpha(1))
      .on('pointerout', () => btn.setAlpha(1))
  }

  private goToNext() {
    this.input.off('pointerdown', this.goToNext, this)

    // ステート更新
    const trustDelta = this.getReputationDelta(this.resultData.outcome)
    const reward = this.getReward(this.resultData.outcome)
    this.state.completeEpisode(
      this.resultData.outcome.grade === 'PERFECT' ? 'PERFECT' :
      this.resultData.outcome.grade === 'GOOD' ? 'GOOD' : 'DAMAGED',
      trustDelta,
      reward
    )

    // 次の対話シーンへ（またはエピソード終了）
    this.scene.start('DialogueScene')
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    this.state.updateSafeArea(gameSize.width, gameSize.height)
  }

  shutdown() {
    this.scale.off('resize', this.onResize, this)
    this.input.off('pointerdown', this.goToNext, this)
  }
}

// ラベルマップ（簡易）
const INGREDIENT_LABELS: Record<string, string> = {
  adelhyde: 'アデル', brandy: 'ブラン', powderK: 'パウダー', flanergide: 'フラネル', karmotrine: 'カーモ',
  ice: '氷', syrup: 'シロップ', bitters: 'ビター', soda: 'ソーダ', energy: 'エナジ',
}