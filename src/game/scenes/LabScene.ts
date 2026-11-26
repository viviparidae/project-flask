import Phaser from 'phaser'
import {
  RECIPE_EP01,
  RECIPE_EP02,
  RECIPE_EP03,
  type Recipe,
  type RecipeAttempt,
  type RecipeStep,
  createEmptyAttempt,
  executeStep,
  evaluateRecipe,
} from '../../lib/recipeEngine'
import { executeTreatment, type TreatmentResult } from '../../lib/treatmentEngine'
import { GameState } from '../state/GameState'

/**
 * LabScene — レシピ式調合画面（新設計）
 *
 * 画面構成 (1280 × 720):
 * ┌─────────────────────────────────────────────────────────────┐
 * │ HUD（評判・所持金）                                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │ 📋 レシピカード                                              │
 * │ ┌─────────────────────────────────────────────────────────┐ │
 * │ │ 古剣 腐食除去処置                                         │ │
 * │ │ 目標: リン酸洗浄液（pH 2〜3、温度 35〜45℃）                │ │
 * │ │                                                         │ │
 * │ │ 📦 材料                                                  │ │
 * │ │   ・リン酸 (H₃PO₄) — 標準濃度                             │ │
 * │ │   ・蒸留水 — 希釈用                                       │ │
 * │ │   ・古剣（対象）                                          │ │
 * │ │   ・耐熱ガラス容器                                        │ │
 * │ │   ・濾過紙・漏斗                                          │ │
 * │ │                                                         │ │
 * │ │ 📝 手順                                                  │ │
 * │ │   1. リン酸を標準濃度で準備する                           │ │
 * │ │      → 塩化物錆に有効で、金属母材を傷めない濃度だから       │ │
 * │ │   2. 蒸留水で希釈してpH 2〜3に調整する                   │ │
 * │ │      → 強すぎると鉄を侵食し、弱すぎると錆が落ちないから     │ │
 * │ │   3. 中温（35〜45℃）で加温する                           │ │
 * │ │      → 反応速度と安全性のバランスが取れる適温だから       │ │
 * │ │   4. 標準時間浸透させる                                   │ │
 * │ │      → 深部の塩化物錆まで届くには十分な時間が必要だから     │ │
 * │ │   5. 丁寧に濾過して完成                                   │ │
 * │ │      → 不純物を取り除き、純度の高い洗浄液に仕上げるため   │ │
 * │ └─────────────────────────────────────────────────────────┘ │
 * ├─────────────────────────────────────────────────────────────┤
 * │ 🧪 リアクター（現在の手順のビジュアル）                       │
 * ├─────────────────────────────────────────────────────────────┤
 * │ [🔄 リセット]  [🗡️ 次の手順を実行する]                       │
 * └─────────────────────────────────────────────────────────────┘
 */

export class LabScene extends Phaser.Scene {
  private attempt: RecipeAttempt = createEmptyAttempt()
  private state!: GameState
  private currentResult!: TreatmentResult
  private recipe: Recipe = RECIPE_EP01
  private modalObjects: Phaser.GameObjects.GameObject[] = []

  // UI 参照
  private vesselContainer!: Phaser.GameObjects.Container
  private liquidGraphics!: Phaser.GameObjects.Graphics
  private bubbles: { x: number; y: number; r: number; speed: number; alpha: number }[] = []
  private stepTitleText!: Phaser.GameObjects.Text
  private stepReasonText!: Phaser.GameObjects.Text
  private progressText!: Phaser.GameObjects.Text
  private executeButton!: Phaser.GameObjects.Container

  // アニメーション状態
  private isExecuting = false
  private bubbleTimer?: Phaser.Time.TimerEvent

  constructor() {
    super({ key: 'LabScene' })
  }

  init(data: { gameState: GameState }) {
    this.state = data.gameState || (this.game.registry.get('gameState') as GameState)
  }

  /** 現在のエピソードに応じてレシピを選択 */
  private selectRecipeForCurrentEpisode() {
    switch (this.state.currentEpisode) {
      case 'ep02':
        this.recipe = RECIPE_EP02
        break
      case 'ep03':
        this.recipe = RECIPE_EP03
        break
      case 'ep01':
      default:
        this.recipe = RECIPE_EP01
        break
    }
    // 試行状態をリセット
    this.attempt = createEmptyAttempt()
  }

  create() {
    // 現在のエピソードに応じてレシピを選択
    this.selectRecipeForCurrentEpisode()

    const { width, height } = this.scale

    // 背景描画
    this.drawBackground()

    // 初期計算
    this.computeResult()

    // セーフエリア基準値
    const safeL = this.state?.safeArea?.left ?? 0
    const safeR = this.state?.safeArea?.right ?? 0
    const safeB = this.state?.safeArea?.bottom ?? 0
    const safeT = this.state?.safeArea?.top ?? 0
    const topY = 62 + safeT
    const actionBarY = height - safeB - 56
    const contentH = Math.max(0, actionBarY - topY - 12)

    // レイアウト: レシピカード（上部） + リアクター（中部） + アクションバー（下部）
    const cardX = safeL + 16
    const cardW = width - safeL - safeR - 32
    const cardH = 380

    const reactorX = safeL + 16
    const reactorW = width - safeL - safeR - 32
    const reactorY = topY + cardH + 16
    const reactorH = actionBarY - reactorY - 16

    // 1. レシピカード
    this.createRecipeCard(cardX, topY, cardW, cardH)

    // 2. リアクター（現在の手順ビジュアル）
    this.createReactorPanel(reactorX, reactorY, reactorW, reactorH)

    // 3. 下部アクションバー
    this.createBottomActionBar(width, height)

    // 画面の更新
    this.refreshAll()

    // リサイズとキーボード
    this.scale.on('resize', this.onResize, this)
    this.setupKeyboardShortcuts()

    // 泡アニメーション用タイマー
    this.bubbleTimer = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => this.updateBubbles(),
    })
  }

  // ────────────────────────────────────────
  // 背景描画
  // ────────────────────────────────────────
  private drawBackground() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#0b1020')

    const g = this.add.graphics()
    // ベースグラデーション
    g.fillGradientStyle(0x0b1020, 0x0b1020, 0x10172c, 0x10172c, 1)
    g.fillRect(0, 0, width, height)

    // 微細グリッド（サイバー調）
    g.lineStyle(1, 0x1f293d, 0.25)
    for (let x = 0; x < width; x += 40) {
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x, height)
      g.strokePath()
    }
    for (let y = 0; y < height; y += 40) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(width, y)
      g.strokePath()
    }
  }

  // ────────────────────────────────────────
  // レシピカード
  // ────────────────────────────────────────
  private createRecipeCard(x: number, y: number, w: number, h: number) {
    const container = this.add.container(x, y)

    // パネル枠・背景
    const bg = this.add.graphics()
    bg.fillStyle(0x111827, 0.95)
    bg.fillRoundedRect(0, 0, w, h, 14)
    bg.lineStyle(1.5, 0x243048, 0.8)
    bg.strokeRoundedRect(0, 0, w, h, 14)
    container.add(bg)

    // ヘッダーバー
    const headerBg = this.add.graphics()
    headerBg.fillStyle(0x1a243a, 0.8)
    headerBg.fillRoundedRect(0, 0, w, 44, { tl: 14, tr: 14, bl: 0, br: 0 })
    container.add(headerBg)

    const headerTitle = this.add.text(16, 12, '📋 レシピカード', {
      fontSize: '18px',
      color: '#65e6ad',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })
    container.add(headerTitle)

    // レシピ名・目標
    const nameText = this.add.text(16, 52, this.recipe.name, {
      fontSize: '16px',
      color: '#ffd700',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })
    container.add(nameText)

    const compoundText = this.add.text(16, 76, '目標: ' + this.recipe.compound, {
      fontSize: '13px',
      color: '#8bcfef',
      fontFamily: 'system-ui, sans-serif',
      wordWrap: { width: w - 32 },
    })
    container.add(compoundText)

    // 区切り線
    const sep1 = this.add.graphics()
    sep1.lineStyle(1, 0x243048, 0.8)
    sep1.beginPath()
    sep1.moveTo(16, 102)
    sep1.lineTo(w - 16, 102)
    sep1.strokePath()
    container.add(sep1)

    // 材料
    const ingredientsTitle = this.add.text(16, 110, '📦 材料', {
      fontSize: '15px',
      color: '#facc15',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })
    container.add(ingredientsTitle)

    let curY = 136
    this.recipe.ingredients.forEach((ingredient) => {
      const ingText = this.add.text(24, curY, '・' + ingredient, {
        fontSize: '13px',
        color: '#cbd5e1',
        fontFamily: 'system-ui, sans-serif',
        wordWrap: { width: w - 48 },
      })
      container.add(ingText)
      curY += 22
    })

    // 区切り線
    curY += 4
    const sep2 = this.add.graphics()
    sep2.lineStyle(1, 0x243048, 0.8)
    sep2.beginPath()
    sep2.moveTo(16, curY)
    sep2.lineTo(w - 16, curY)
    sep2.strokePath()
    container.add(sep2)
    curY += 8

    // 手順
    const stepsTitle = this.add.text(16, curY, '📝 手順', {
      fontSize: '15px',
      color: '#facc15',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })
    container.add(stepsTitle)
    curY += 24

    this.recipe.steps.forEach((step, idx) => {
      // 手順番号・ラベル
      const isCurrent = idx === this.attempt.currentStepIndex
      const isCompleted = idx < this.attempt.currentStepIndex
      const stepColor = isCurrent ? '#65e6ad' : isCompleted ? '#86efac' : '#cbd5e1'
      const prefix = isCurrent ? '▶ ' : isCompleted ? '✓ ' : '  '

      const stepText = this.add.text(24, curY, `${prefix}${idx + 1}. ${step.label}`, {
        fontSize: '13px',
        color: stepColor,
        fontFamily: 'system-ui, sans-serif',
        fontStyle: isCurrent ? 'bold' : 'normal',
        wordWrap: { width: w - 48 },
      })
      container.add(stepText)
      curY += 22

      // 理由（1行）
      const reasonText = this.add.text(40, curY, '→ ' + step.reason, {
        fontSize: '11px',
        color: isCurrent ? '#93c5fd' : isCompleted ? '#64748b' : '#64748b',
        fontFamily: 'system-ui, sans-serif',
        fontStyle: 'italic',
        wordWrap: { width: w - 56 },
      })
      container.add(reasonText)
      curY += 20
    })

    // 進行度表示
    const progressY = h - 30
    this.progressText = this.add.text(w / 2, progressY, '', {
      fontSize: '13px',
      color: '#94a3b8',
      fontFamily: 'system-ui, sans-serif',
      align: 'center',
    }).setOrigin(0.5)
    container.add(this.progressText)
  }

  // ────────────────────────────────────────
  // リアクターパネル（現在の手順ビジュアル）
  // ────────────────────────────────────────
  private createReactorPanel(x: number, y: number, w: number, h: number) {
    const container = this.add.container(x, y)

    // パネル枠
    const bg = this.add.graphics()
    bg.fillStyle(0x0f1422, 0.95)
    bg.fillRoundedRect(0, 0, w, h, 14)
    bg.lineStyle(1.5, 0x1f293d, 0.8)
    bg.strokeRoundedRect(0, 0, w, h, 14)
    container.add(bg)

    // ヘッダーバー
    const headerBg = this.add.graphics()
    headerBg.fillStyle(0x172033, 0.8)
    headerBg.fillRoundedRect(0, 0, w, 44, { tl: 14, tr: 14, bl: 0, br: 0 })
    container.add(headerBg)

    const title = this.add.text(w / 2, 22, '🧪 リアクター', {
      fontSize: '17px',
      color: '#8bcfef',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    container.add(title)

    // 現在の手順表示エリア
    const stepAreaY = 60
    const stepAreaH = 120

    const stepBg = this.add.graphics()
    stepBg.fillStyle(0x111827, 0.9)
    stepBg.fillRoundedRect(16, stepAreaY, w - 32, stepAreaH, 10)
    stepBg.lineStyle(1, 0x243048, 0.6)
    stepBg.strokeRoundedRect(16, stepAreaY, w - 32, stepAreaH, 10)
    container.add(stepBg)

    this.stepTitleText = this.add.text(w / 2, stepAreaY + 20, '', {
      fontSize: '18px',
      color: '#65e6ad',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: w - 64 },
    }).setOrigin(0.5)
    container.add(this.stepTitleText)

    this.stepReasonText = this.add.text(w / 2, stepAreaY + 55, '', {
      fontSize: '14px',
      color: '#93c5fd',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'italic',
      align: 'center',
      wordWrap: { width: w - 64 },
    }).setOrigin(0.5)
    container.add(this.stepReasonText)

    // フラスコ / シェイカー
    const vesselW = 126
    const vesselH = 200
    const centerX = w / 2 - 14
    const centerY = stepAreaY + stepAreaH + 60

    this.vesselContainer = this.add.container(centerX, centerY)
    container.add(this.vesselContainer)

    // フラスコ外枠
    const glass = this.add.graphics()
    glass.fillStyle(0xffffff, 0.04)
    glass.fillRoundedRect(-vesselW / 2, -vesselH / 2, vesselW, vesselH, 16)
    glass.lineStyle(2.5, 0x94a3b8, 0.4)
    glass.strokeRoundedRect(-vesselW / 2, -vesselH / 2, vesselW, vesselH, 16)

    // ガラスハイライト反射光
    glass.lineStyle(2, 0xffffff, 0.25)
    glass.beginPath()
    glass.moveTo(-vesselW / 2 + 10, -vesselH / 2 + 20)
    glass.lineTo(-vesselW / 2 + 10, vesselH / 2 - 20)
    glass.strokePath()

    // 栓（ストッパー）
    glass.fillStyle(0x334155, 1)
    glass.fillRoundedRect(-24, -vesselH / 2 - 12, 48, 14, 6)
    glass.lineStyle(1.5, 0x64748b, 0.8)
    glass.strokeRoundedRect(-24, -vesselH / 2 - 12, 48, 14, 6)
    this.vesselContainer.add(glass)

    // 液体グラフィックス
    this.liquidGraphics = this.add.graphics()
    this.vesselContainer.add(this.liquidGraphics)

    // 液量ゲージ
    const gaugeX = centerX + vesselW / 2 + 16
    const gaugeY = centerY - vesselH / 2
    const gaugeBg = this.add.graphics()
    gaugeBg.fillStyle(0x1e293b, 1)
    gaugeBg.fillRoundedRect(gaugeX, gaugeY, 8, vesselH, 4)
    gaugeBg.lineStyle(1, 0x334155, 0.7)
    gaugeBg.strokeRoundedRect(gaugeX, gaugeY, 8, vesselH, 4)
    container.add(gaugeBg)

    this.volumeBar = this.add.graphics()
    container.add(this.volumeBar)

    // 完了時の結果表示エリア
    const resultAreaY = centerY + vesselH / 2 + 20
    const resultAreaH = h - resultAreaY - 16

    const resultBg = this.add.graphics()
    resultBg.fillStyle(0x111827, 0.9)
    resultBg.fillRoundedRect(16, resultAreaY, w - 32, resultAreaH, 10)
    resultBg.lineStyle(1, 0x243048, 0.6)
    resultBg.strokeRoundedRect(16, resultAreaY, w - 32, resultAreaH, 10)
    container.add(resultBg)

    this.resultTitleText = this.add.text(w / 2, resultAreaY + 16, '', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: w - 64 },
    }).setOrigin(0.5)
    container.add(this.resultTitleText)

    this.resultDetailText = this.add.text(w / 2, resultAreaY + 50, '', {
      fontSize: '13px',
      color: '#94a3b8',
      fontFamily: 'system-ui, sans-serif',
      align: 'center',
      wordWrap: { width: w - 64 },
    }).setOrigin(0.5)
    container.add(this.resultDetailText)
  }

  // Result display texts (need to be declared)
  private resultTitleText!: Phaser.GameObjects.Text
  private resultDetailText!: Phaser.GameObjects.Text
  private volumeBar!: Phaser.GameObjects.Graphics

  // ────────────────────────────────────────
  // 下部アクションバー
  // ────────────────────────────────────────
  private createBottomActionBar(width: number, height: number) {
    const safeB = this.state?.safeArea?.bottom ?? 0
    const barY = height - safeB - 56

    // [🔄 リセット]
    this.createActionButton(16, barY, 150, 50, '🔄 リセット', '#641b1b', () => this.resetTreatment())

    // [🗡️ 次の手順を実行する] (大型・目立つ)
    const execW = Math.min(706, width - 180 - 16)
    this.executeButton = this.createActionButton(180, barY, execW, 50, '🗡️ 次の手順を実行する', '#059669', () => this.executeNextStep())
  }

  private createActionButton(x: number, y: number, w: number, h: number, label: string, colorHex: string, onClick: () => void) {
    const container = this.add.container(x, y)
    const bg = this.add.graphics()
    const colorInt = parseInt(colorHex.replace('#', ''), 16)

    const drawBtn = (hover: boolean) => {
      bg.clear()
      bg.fillStyle(colorInt, hover ? 0.95 : 0.85)
      bg.fillRoundedRect(0, 0, w, h, 10)
      bg.lineStyle(1.5, hover ? 0xffffff : 0x4ade80, hover ? 0.8 : 0.4)
      bg.strokeRoundedRect(0, 0, w, h, 10)
    }
    drawBtn(false)
    container.add(bg)

    const text = this.add.text(w / 2, h / 2, label, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    container.add(text)

    container.setSize(w, h)
    const hit = new Phaser.Geom.Rectangle(w / 2, h / 2, w, h)
    container.setInteractive(hit, Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => {
        container.setScale(0.97)
        onClick()
      })
      .on('pointerup', () => {
        container.setScale(1)
        drawBtn(false)
      })
      .on('pointerover', () => drawBtn(true))
      .on('pointerout', () => {
        container.setScale(1)
        drawBtn(false)
      })

    return container
  }

  // ────────────────────────────────────────
  // 計算・更新
  // ────────────────────────────────────────
  private computeResult() {
    this.currentResult = executeTreatment(this.attempt)
  }

  private showToast(text: string, color = '#4ade80') {
    const toast = this.add.text(this.scale.width / 2, this.scale.height / 2, text, {
      fontSize: '20px',
      color,
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 8,
      backgroundColor: '#0f172a',
      padding: { x: 24, y: 14 },
    }).setOrigin(0.5).setDepth(250)
    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 40,
      duration: 900,
      delay: 1600,
      onComplete: () => toast.destroy(),
    })
  }

  // ────────────────────────────────────────
  // 次の手順を実行
  // ────────────────────────────────────────
  private executeNextStep() {
    if (this.isExecuting) return
    if (this.attempt.currentStepIndex >= this.recipe.steps.length) {
      // 全手順完了済み → 結果シーンへ
      this.goToResult()
      return
    }

    const currentStep = this.recipe.steps[this.attempt.currentStepIndex]

    // 正解パラメータで自動実行（プレイヤーは「実行」を押すだけ）
    // ミスを入れる場合は将来的に選択肢を出せるが、Phase 1では正解で通す
    const playerParams = { ...currentStep.correctParams }

    this.isExecuting = true

    // 手順実行アニメーション
    this.tweens.add({
      targets: this.vesselContainer,
      x: { from: this.vesselContainer.x, to: this.vesselContainer.x + 8 },
      duration: 100,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // 手順を進める
        this.attempt = executeStep(this.recipe, this.attempt, playerParams)
        this.computeResult()
        this.isExecuting = false
        this.refreshAll()

        // 全手順完了チェック
        if (this.attempt.currentStepIndex >= this.recipe.steps.length) {
          this.showToast('全手順完了！納品へ', '#4ade80')
          this.time.delayedCall(1500, () => this.goToResult())
        }
      },
    })
  }

  // ────────────────────────────────────────
  // 結果シーンへ遷移
  // ────────────────────────────────────────
  private goToResult() {
    this.scene.start('ResultScene', {
      outcome: this.currentResult.fate,
      recipeResult: this.currentResult.recipeResult,
      attempt: this.attempt,
      recipe: this.recipe,
      episodeId: this.state.currentEpisode,
    })
  }

  // ────────────────────────────────────────
  // リセット処理
  // ────────────────────────────────────────
  private resetTreatment() {
    if (this.isExecuting) return
    this.attempt = createEmptyAttempt()
    this.computeResult()
    this.refreshAll()

    const clearText = this.add.text(this.scale.width / 2, this.scale.height / 2, '🔄 リセット完了', {
      fontSize: '24px',
      color: '#f87171',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#0f172a',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setDepth(200)

    this.tweens.add({
      targets: clearText,
      alpha: 0,
      y: clearText.y - 40,
      duration: 600,
      onComplete: () => clearText.destroy(),
    })
  }

  // ────────────────────────────────────────
  // UIの全体再描画
  // ────────────────────────────────────────
  private refreshAll() {
    this.updateRecipeCard()
    this.updateReactor()
    this.updateActionButton()
  }

  private updateRecipeCard() {
    // 進行度テキスト更新
    const progress = this.currentResult.recipeResult.progress
    const tier = this.currentResult.recipeResult.qualityTier
    const tierLabels: Record<string, string> = {
      perfect: '✨ 完璧',
      good: '🗡️ 良好',
      partial: '⚠️ 部分的',
      failed: '💀 失敗',
    }
    this.progressText.setText(`手順 ${progress.completed} / ${progress.total} 完了  |  品質: ${tierLabels[tier] || tier}`)
  }

  private updateReactor() {
    const currentStep = this.recipe.steps[this.attempt.currentStepIndex]
    const isComplete = this.attempt.currentStepIndex >= this.recipe.steps.length

    if (isComplete) {
      this.stepTitleText.setText('✅ 全手順完了')
      this.stepReasonText.setText('納品の準備が整いました')
    } else if (currentStep) {
      this.stepTitleText.setText(`手順 ${currentStep.id + 1}: ${currentStep.label}`)
      this.stepReasonText.setText(currentStep.reason)
    }

    // 液体描画（手順に応じて変化）
    this.updateLiquid()

    // 結果表示エリア
    if (isComplete) {
      const tier = this.currentResult.recipeResult.qualityTier
      const tierConfig: Record<string, { title: string; color: string; detail: string }> = {
        perfect: { title: '✨ 完全修復 — 神業の腐食除去', color: '#4ade80', detail: '全手順を正確に実行。リン酸洗浄液が完璧に調合され、剣の輝きが蘇る。' },
        good: { title: '🗡️ 良好な修復', color: '#38bdf8', detail: '1つ手順をミスしたが、実用には十分な品質。わずかな痕跡が残る。' },
        partial: { title: '⚠️ 修復不完全 — 腐食残存', color: '#facc15', detail: '2つ手順をミス。深部の錆が残り、再処理が必要。' },
        failed: { title: '💀 失敗 — 品質不足', color: '#f87171', detail: '多数の手順ミス。洗浄液として機能しない。' },
      }
      const cfg = tierConfig[tier] || tierConfig.failed
      this.resultTitleText.setText(cfg.title)
      this.resultTitleText.setColor(cfg.color)
      this.resultDetailText.setText(cfg.detail)
    } else {
      this.resultTitleText.setText('')
      this.resultDetailText.setText('')
    }
  }

  private updateLiquid() {
    const vesselW = 118
    const vesselH = 190

    // 手順進行に応じた液量・色
    const progressRatio = this.attempt.currentStepIndex / this.recipe.steps.length
    const fillRatio = 0.3 + progressRatio * 0.6 // 30%〜90%

    // 色：リン酸系（緑系）
    const baseColor = 0x22c55e

    const liquidH = vesselH * fillRatio
    const liquidY = vesselH / 2 - liquidH

    this.liquidGraphics.clear()

    // 液体グラデーション多層塗り
    const layers = 6
    const r = (baseColor >> 16) & 0xff
    const g = (baseColor >> 8) & 0xff
    const b = baseColor & 0xff

    for (let i = 0; i < layers; i++) {
      const lh = liquidH / layers
      const ly = liquidY + i * lh
      const factor = 0.6 + 0.4 * (i / (layers - 1))
      const c = Phaser.Display.Color.GetColor(
        Math.min(255, Math.round(r * factor)),
        Math.min(255, Math.round(g * factor)),
        Math.min(255, Math.round(b * factor))
      )
      this.liquidGraphics.fillStyle(c, 0.9)
      this.liquidGraphics.fillRoundedRect(
        -vesselW / 2 + 3,
        ly,
        vesselW - 6,
        lh + (i === layers - 1 ? 2 : 0),
        i === layers - 1 ? 12 : 0
      )
    }

    // 液面ハイライト
    this.liquidGraphics.fillStyle(0xffffff, 0.25)
    this.liquidGraphics.fillRect(-vesselW / 2 + 6, liquidY + 2, vesselW - 12, 4)

    // 泡パーティクル
    this.liquidGraphics.fillStyle(0xffffff, 0.4)
    this.bubbles.forEach((bub) => {
      this.liquidGraphics.fillCircle(bub.x, bub.y, bub.r)
    })

    // ゲージ更新
    this.volumeBar.clear()
    this.volumeBar.fillStyle(baseColor, 0.9)
    const gaugeX = this.vesselContainer.x + vesselW / 2 + 20
    const gaugeY = this.vesselContainer.y - vesselH / 2
    this.volumeBar.fillRoundedRect(gaugeX + 1, gaugeY + vesselH * (1 - fillRatio), 6, vesselH * fillRatio, 3)
  }

  private updateBubbles() {
    const vesselW = 100
    const vesselH = 190
    const liquidY = vesselH / 2 - vesselH * 0.65

    // 新しい泡
    if (this.bubbles.length < 8 && Math.random() < 0.4) {
      this.bubbles.push({
        x: Phaser.Math.Between(-vesselW / 2 + 10, vesselW / 2 - 10),
        y: vesselH / 2 - 8,
        r: Phaser.Math.Between(2, 4),
        speed: Phaser.Math.FloatBetween(1.2, 2.8),
        alpha: 0.5,
      })
    }

    // 移動
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]
      b.y -= b.speed
      if (b.y <= liquidY + 4) {
        this.bubbles.splice(i, 1)
      }
    }

    if (this.liquidGraphics) {
      this.updateLiquid()
    }
  }

  private updateActionButton() {
    const isComplete = this.attempt.currentStepIndex >= this.recipe.steps.length
    const btn = this.executeButton
    if (!btn) return

    const text = btn.list.find((obj) => obj instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text
    const bg = btn.list.find((obj) => obj instanceof Phaser.GameObjects.Graphics) as Phaser.GameObjects.Graphics

    if (isComplete) {
      if (text) text.setText('🗡️ 納品する')
      if (bg) {
        bg.clear()
        bg.fillStyle(0x059669, 0.95)
        bg.fillRoundedRect(0, 0, btn.width, btn.height, 10)
        bg.lineStyle(2, 0x4ade80, 0.8)
        bg.strokeRoundedRect(0, 0, btn.width, btn.height, 10)
      }
    } else {
      if (text) text.setText('🗡️ 次の手順を実行する')
      if (bg) {
        bg.clear()
        bg.fillStyle(0x059669, 0.85)
        bg.fillRoundedRect(0, 0, btn.width, btn.height, 10)
        bg.lineStyle(1.5, 0x4ade80, 0.4)
        bg.strokeRoundedRect(0, 0, btn.width, btn.height, 10)
      }
    }
  }

  // ────────────────────────────────────────
  // ショートカット
  // ────────────────────────────────────────
  private setupKeyboardShortcuts() {
    this.input.keyboard?.on('keydown-ENTER', () => this.executeNextStep())
    this.input.keyboard?.on('keydown-E', () => this.executeNextStep())
    this.input.keyboard?.on('keydown-R', () => this.resetTreatment())
    this.input.keyboard?.on('keydown-SPACE', () => this.executeNextStep())
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    this.state?.updateSafeArea(gameSize.width, gameSize.height)
  }

  shutdown() {
    this.scale.off('resize', this.onResize, this)
    this.input.keyboard?.removeAllListeners()
    if (this.bubbleTimer) {
      this.bubbleTimer.destroy()
    }
  }
}