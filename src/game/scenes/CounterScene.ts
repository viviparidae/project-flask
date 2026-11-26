import Phaser from 'phaser'
import { GameState } from '../state/GameState'
import {
  RECIPE_EP01,
  type Recipe,
  type RecipeAttempt,
  createEmptyAttempt,
  executeStep,
} from '../../lib/recipeEngine'
import { executeTreatment, type TreatmentResult } from '../../lib/treatmentEngine'
import {
  ep01Story,
  type DialogueNode,
  getPostDeliveryNodes,
  getInitialPostDeliveryNodeId,
  initialDialogueState,
} from '../../lib/dialogueEngine'

// ────────────────────────────────────────
// カウンター画面のフェーズ
// ────────────────────────────────────────
type CounterPhase =
  | 'dialogue'       // 依頼人との会話
  | 'recipe'         // レシピ表示・手順実行
  | 'postDelivery'   // 納品後の反応会話

const MOOD_EMOJI: Record<string, string> = {
  neutral: '😐',
  sad: '😔',
  tense: '😤',
  hopeful: '🙂',
  analytical: '🤔',
  angry: '😡',
  grateful: '😊',
  disappointed: '😞',
}

const MOOD_COLOR: Record<string, string> = {
  neutral: '#7a8a9a',
  sad: '#7090b8',
  tense: '#f87171',
  hopeful: '#65e6ad',
  analytical: '#8bcfef',
  angry: '#f87171',
  grateful: '#4ade80',
  disappointed: '#facc15',
}

/** カウンター画面 — VA-11 Hall-A 風：会話と調合を同じ画面で完結 */
export class CounterScene extends Phaser.Scene {
  // ステート
  private state!: GameState
  private phase: CounterPhase = 'dialogue'
  private dialogueState = { ...initialDialogueState }
  private postDeliveryNodes: Record<string, DialogueNode> = {}
  private currentOutcomeGrade: string = ''
  private recipe: Recipe = RECIPE_EP01
  private attempt: RecipeAttempt = createEmptyAttempt()
  private treatmentResult!: TreatmentResult
  private isTyping = false

  // UI 参照
  private bgGraphics!: Phaser.GameObjects.Graphics
  private characterContainer!: Phaser.GameObjects.Container
  private characterEmoji!: Phaser.GameObjects.Text
  private speakerNameText!: Phaser.GameObjects.Text
  private messageText!: Phaser.GameObjects.Text
  private moodEmojiText!: Phaser.GameObjects.Text
  private nextButton!: Phaser.GameObjects.Container
  private nextButtonText!: Phaser.GameObjects.Text

  // レシピ・調合 UI
  private recipePanel!: Phaser.GameObjects.Container
  private reactorPanel!: Phaser.GameObjects.Container
  private vesselContainer!: Phaser.GameObjects.Container
  private liquidGraphics!: Phaser.GameObjects.Graphics
  private stepTitleText!: Phaser.GameObjects.Text
  private executeButton!: Phaser.GameObjects.Container
  private resetButton!: Phaser.GameObjects.Container
  private bubbles: { x: number; y: number; r: number; speed: number; alpha: number }[] = []
  private bubbleTimer?: Phaser.Time.TimerEvent

  constructor() {
    super({ key: 'CounterScene' })
  }

  init(data: { gameState: GameState }) {
    this.state = data.gameState || (this.game.registry.get('gameState') as GameState)
    // 初期化
    this.phase = 'dialogue'
    this.dialogueState = { ...initialDialogueState }
    this.attempt = createEmptyAttempt()
    this.postDeliveryNodes = {}
    this.currentOutcomeGrade = ''
  }

  create() {
    const { width, height } = this.scale
    const safeT = this.state?.safeArea?.top ?? 0
    const safeB = this.state?.safeArea?.bottom ?? 0
    const safeL = this.state?.safeArea?.left ?? 0
    const safeR = this.state?.safeArea?.right ?? 0

    // 背景
    this.bgGraphics = this.add.graphics()
    this.drawBackground()

    // キャラクター表示エリア（左上寄り）
    this.characterContainer = this.add.container(safeL + 80, safeT + 120)
    this.characterEmoji = this.add.text(0, 0, '🏕️', { fontSize: '96px' }).setOrigin(0.5)
    this.characterContainer.add(this.characterEmoji)

    // 発言者名
    this.speakerNameText = this.add.text(safeL + 80, safeT + 230, '', {
      fontSize: '22px',
      color: '#c49060',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0)

    // ムード絵文字
    this.moodEmojiText = this.add.text(width - safeR - 80, safeT + 230, '', {
      fontSize: '32px',
    }).setOrigin(0.5, 0)

    // メッセージウィンドウ（下部中央、VA-11 風）
    const windowY = height - safeB - 220
    this.messageText = this.add.text(width / 2, windowY, '', {
      fontSize: '20px',
      color: '#e0e0e0',
      fontFamily: 'system-ui, sans-serif',
      lineSpacing: 10,
      wordWrap: { width: width - safeL - safeR - 80 },
      align: 'center',
    }).setOrigin(0.5, 0)

    // 次へボタン（右下、VA-11 風の小さめボタン）
    this.nextButton = this.createNextButton()
    this.positionNextButton()

    // レシピパネル（初期非表示）
    this.createRecipePanel()

    // リアクターパネル（初期非表示）
    this.createReactorPanel()

    // 最初の会話を表示
    this.showCurrentDialogueNode()

    // リサイズ対応
    this.scale.on('resize', this.onResize, this)

    // クリック/タップで次へ
    this.input.on('pointerdown', this.handlePointerDown, this)

    // キーボードショートカット
    this.input.keyboard?.on('keydown-SPACE', () => this.handlePointerDown())
    this.input.keyboard?.on('keydown-ENTER', () => this.handlePointerDown())
  }

  // ────────────────────────────────────────
  // 背景描画（カウンター風：暗いバーの雰囲気）
  // ────────────────────────────────────────
  private drawBackground() {
    const { width, height } = this.scale
    this.bgGraphics.clear()

    // 基調：暗いネオンバー風
    this.bgGraphics.fillGradientStyle(0x0a0a14, 0x0a0a14, 0x141028, 0x141028, 1)
    this.bgGraphics.fillRect(0, 0, width, height)

    // カウンター天板（下部に薄いライン）
    this.bgGraphics.lineStyle(2, 0x3a2d4a, 0.4)
    this.bgGraphics.beginPath()
    this.bgGraphics.moveTo(0, height * 0.72)
    this.bgGraphics.lineTo(width, height * 0.72)
    this.bgGraphics.strokePath()

    // 奥の棚・ボトルのシルエット
    this.bgGraphics.fillStyle(0x181030, 0.6)
    for (let i = 0; i < 12; i++) {
      const x = 60 + i * 90
      const bottleH = Phaser.Math.Between(80, 160)
      const bottleW = 24
      this.bgGraphics.fillRoundedRect(x, height * 0.72 - bottleH, bottleW, bottleH, 4)
      // 首
      this.bgGraphics.fillRect(x + 6, height * 0.72 - bottleH - 20, 12, 20)
    }

    // ネオンアクセント（薄いピンク・シアンのライン）
    this.bgGraphics.lineStyle(1, 0xff6ec7, 0.15)
    this.bgGraphics.beginPath()
    this.bgGraphics.moveTo(0, height * 0.35)
    this.bgGraphics.lineTo(width, height * 0.35)
    this.bgGraphics.strokePath()

    this.bgGraphics.lineStyle(1, 0x6effff, 0.1)
    this.bgGraphics.beginPath()
    this.bgGraphics.moveTo(0, height * 0.55)
    this.bgGraphics.lineTo(width, height * 0.55)
    this.bgGraphics.strokePath()
  }

  // ────────────────────────────────────────
  // 次へボタン（VA-11 風：小さめ、右下）
  // ────────────────────────────────────────
  private createNextButton(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0)

    const bg = this.add.graphics()
    bg.fillStyle(0x2d6a4f, 0.9)
    bg.fillRoundedRect(-70, -22, 140, 44, 10)
    bg.lineStyle(1.5, 0x4ade80, 0.5)
    bg.strokeRoundedRect(-70, -22, 140, 44, 10)

    this.nextButtonText = this.add.text(0, 0, '次へ', {
      fontSize: '17px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    container.add([bg, this.nextButtonText])
    container.setSize(140, 44)

    const hitArea = new Phaser.Geom.Rectangle(-70, -22, 140, 44)
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => {
        container.setAlpha(0.7)
      })
      .on('pointerup', () => {
        container.setAlpha(1)
      })
      .on('pointerout', () => {
        container.setAlpha(1)
      })

    return container
  }

  private positionNextButton() {
    const { width, height } = this.scale
    const safeB = this.state?.safeArea?.bottom ?? 0
    const safeR = this.state?.safeArea?.right ?? 0
    this.nextButton.setPosition(width - safeR - 80, height - safeB - 60)
  }

  // ────────────────────────────────────────
  // レシピパネル（右側、材料と手順のみ表示）
  // ────────────────────────────────────────
  private createRecipePanel() {
    const { width, height } = this.scale
    const safeR = this.state?.safeArea?.right ?? 0
    const safeT = this.state?.safeArea?.top ?? 0

    const panelW = 340
    const panelX = width - safeR - panelW - 16
    const panelY = safeT + 20
    const panelH = height - safeT - 20 - 160 // ボタン分を空ける

    this.recipePanel = this.add.container(panelX, panelY)
    this.recipePanel.setVisible(false)

    const bg = this.add.graphics()
    bg.fillStyle(0x0d0a1a, 0.95)
    bg.fillRoundedRect(0, 0, panelW, panelH, 12)
    bg.lineStyle(1.5, 0x3a2d4a, 0.8)
    bg.strokeRoundedRect(0, 0, panelW, panelH, 12)
    this.recipePanel.add(bg)

    // ヘッダー
    const headerBg = this.add.graphics()
    headerBg.fillStyle(0x1a1030, 0.9)
    headerBg.fillRoundedRect(0, 0, panelW, 40, { tl: 12, tr: 12, bl: 0, br: 0 })
    this.recipePanel.add(headerBg)

    const headerText = this.add.text(panelW / 2, 20, 'RECIPE', {
      fontSize: '16px',
      color: '#ff6ec7',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5)
    this.recipePanel.add(headerText)

    // レシピ名
    const nameText = this.add.text(16, 52, this.recipe.name, {
      fontSize: '14px',
      color: '#ffd700',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      wordWrap: { width: panelW - 32 },
    })
    this.recipePanel.add(nameText)

    // 目標化合物
    const compoundText = this.add.text(16, 78, this.recipe.compound, {
      fontSize: '11px',
      color: '#6effff',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'italic',
      wordWrap: { width: panelW - 32 },
    })
    this.recipePanel.add(compoundText)

    // 区切り
    let curY = 110
    const sep1 = this.add.graphics()
    sep1.lineStyle(1, 0x3a2d4a, 0.6)
    sep1.beginPath()
    sep1.moveTo(16, curY)
    sep1.lineTo(panelW - 16, curY)
    sep1.strokePath()
    this.recipePanel.add(sep1)
    curY += 10

    // 材料
    const ingredientsTitle = this.add.text(16, curY, 'INGREDIENTS', {
      fontSize: '12px',
      color: '#ff6ec7',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 1,
    })
    this.recipePanel.add(ingredientsTitle)
    curY += 22

    this.recipe.ingredients.forEach((ingredient) => {
      const ingText = this.add.text(24, curY, '▸ ' + ingredient, {
        fontSize: '12px',
        color: '#cbd5e1',
        fontFamily: 'system-ui, sans-serif',
        wordWrap: { width: panelW - 48 },
      })
      this.recipePanel.add(ingText)
      curY += 22
    })

    // 区切り
    curY += 6
    const sep2 = this.add.graphics()
    sep2.lineStyle(1, 0x3a2d4a, 0.6)
    sep2.beginPath()
    sep2.moveTo(16, curY)
    sep2.lineTo(panelW - 16, curY)
    sep2.strokePath()
    this.recipePanel.add(sep2)
    curY += 10

    // 手順（理由なし、ラベルのみ）
    const stepsTitle = this.add.text(16, curY, 'PROCEDURE', {
      fontSize: '12px',
      color: '#ff6ec7',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 1,
    })
    this.recipePanel.add(stepsTitle)
    curY += 22

    this.recipe.steps.forEach((step, idx) => {
      const isCurrent = idx === this.attempt.currentStepIndex
      const isCompleted = idx < this.attempt.currentStepIndex
      const stepColor = isCurrent ? '#65e6ad' : isCompleted ? '#86efac' : '#cbd5e1'
      const prefix = isCurrent ? '▶ ' : isCompleted ? '✓ ' : '  '

      const stepText = this.add.text(24, curY, `${prefix}${idx + 1}. ${step.label}`, {
        fontSize: '12px',
        color: stepColor,
        fontFamily: 'system-ui, sans-serif',
        fontStyle: isCurrent ? 'bold' : 'normal',
        wordWrap: { width: panelW - 48 },
      })
      this.recipePanel.add(stepText)
      curY += 22
    })
  }

  // ────────────────────────────────────────
  // リアクターパネル（中央、フラスク・液体アニメーション）
  // ────────────────────────────────────────
  private createReactorPanel() {
    const { width, height } = this.scale
    const safeT = this.state?.safeArea?.top ?? 0
    const safeB = this.state?.safeArea?.bottom ?? 0
    const safeL = this.state?.safeArea?.left ?? 0
    const safeR = this.state?.safeArea?.right ?? 0

    const panelW = width - safeL - safeR - 380 // レシピパネル分を引く
    const panelX = safeL + 16
    const panelY = safeT + 20
    const panelH = height - safeT - safeB - 200

    this.reactorPanel = this.add.container(panelX, panelY)
    this.reactorPanel.setVisible(false)

    // パネル枠
    const bg = this.add.graphics()
    bg.fillStyle(0x0f0a1a, 0.95)
    bg.fillRoundedRect(0, 0, panelW, panelH, 12)
    bg.lineStyle(1.5, 0x2d2040, 0.8)
    bg.strokeRoundedRect(0, 0, panelW, panelH, 12)
    this.reactorPanel.add(bg)

    // ヘッダー
    const headerBg = this.add.graphics()
    headerBg.fillStyle(0x1a1030, 0.9)
    headerBg.fillRoundedRect(0, 0, panelW, 40, { tl: 12, tr: 12, bl: 0, br: 0 })
    this.reactorPanel.add(headerBg)

    const headerText = this.add.text(panelW / 2, 20, 'REACTOR', {
      fontSize: '16px',
      color: '#6effff',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5)
    this.reactorPanel.add(headerText)

    // 現在の手順表示
    const stepAreaY = 60
    const stepAreaH = 80
    const stepBg = this.add.graphics()
    stepBg.fillStyle(0x151028, 0.9)
    stepBg.fillRoundedRect(16, stepAreaY, panelW - 32, stepAreaH, 10)
    stepBg.lineStyle(1, 0x3a2d4a, 0.5)
    stepBg.strokeRoundedRect(16, stepAreaY, panelW - 32, stepAreaH, 10)
    this.reactorPanel.add(stepBg)

    this.stepTitleText = this.add.text(panelW / 2, stepAreaY + 20, '', {
      fontSize: '18px',
      color: '#6effff',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: panelW - 64 },
    }).setOrigin(0.5)
    this.reactorPanel.add(this.stepTitleText)

    // フラスコ / シェイカー
    const vesselW = 110
    const vesselH = 180
    const centerX = panelW / 2
    const centerY = stepAreaY + stepAreaH + vesselH / 2 + 30

    this.vesselContainer = this.add.container(centerX, centerY)
    this.reactorPanel.add(this.vesselContainer)

    // フラスコ外枠
    const glass = this.add.graphics()
    glass.fillStyle(0xffffff, 0.03)
    glass.fillRoundedRect(-vesselW / 2, -vesselH / 2, vesselW, vesselH, 14)
    glass.lineStyle(2, 0x6effff, 0.3)
    glass.strokeRoundedRect(-vesselW / 2, -vesselH / 2, vesselW, vesselH, 14)

    // ガラスハイライト
    glass.lineStyle(1.5, 0xffffff, 0.15)
    glass.beginPath()
    glass.moveTo(-vesselW / 2 + 8, -vesselH / 2 + 16)
    glass.lineTo(-vesselW / 2 + 8, vesselH / 2 - 16)
    glass.strokePath()

    // 栓
    glass.fillStyle(0x2d2040, 1)
    glass.fillRoundedRect(-20, -vesselH / 2 - 10, 40, 12, 5)
    glass.lineStyle(1, 0x6effff, 0.4)
    glass.strokeRoundedRect(-20, -vesselH / 2 - 10, 40, 12, 5)
    this.vesselContainer.add(glass)

    // 液体グラフィックス
    this.liquidGraphics = this.add.graphics()
    this.vesselContainer.add(this.liquidGraphics)

    // 下部アクションボタン
    const btnY = panelH - 70
    this.resetButton = this.createActionButton(16, btnY, 130, 44, 'RESET', '#641b1b', () => this.resetTreatment())
    this.reactorPanel.add(this.resetButton)

    this.executeButton = this.createActionButton(panelW - 16 - 260, btnY, 260, 44, 'EXECUTE STEP', '#059669', () => this.executeNextStep())
    this.reactorPanel.add(this.executeButton)
  }

  private createActionButton(x: number, y: number, w: number, h: number, label: string, colorHex: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    const bg = this.add.graphics()
    const colorInt = parseInt(colorHex.replace('#', ''), 16)

    const drawBtn = (hover: boolean) => {
      bg.clear()
      bg.fillStyle(colorInt, hover ? 0.95 : 0.85)
      bg.fillRoundedRect(0, 0, w, h, 8)
      bg.lineStyle(1.5, hover ? 0xffffff : 0x4ade80, hover ? 0.7 : 0.4)
      bg.strokeRoundedRect(0, 0, w, h, 8)
    }
    drawBtn(false)
    container.add(bg)

    const text = this.add.text(w / 2, h / 2, label, {
      fontSize: '14px',
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
  // 会話表示（タイプライター効果）
  // ────────────────────────────────────────
  private showCurrentDialogueNode() {
    const nodes = this.phase === 'postDelivery' ? this.postDeliveryNodes : ep01Story
    const node = nodes[this.dialogueState.nodeId]
    if (!node) return

    // キャラクター絵文字
    const charEmoji = this.phase === 'postDelivery' ? '🧔' : '🏕️'
    this.characterEmoji.setText(charEmoji)

    // 発言者名
    this.speakerNameText.setText(node.speakerName)
    const color = MOOD_COLOR[node.mood] || '#7a8a9a'
    this.speakerNameText.setColor(color)

    // ムード絵文字
    this.moodEmojiText.setText(MOOD_EMOJI[node.mood] || '😐')

    // タイプライター効果でテキスト表示
    this.typewriterText(node.text)

    // ボタンテキスト更新
    this.nextButtonText.setText(node.nextNodeId === null ? '次へ →' : '次へ')
  }

  private typewriterText(fullText: string) {
    this.messageText.setText('')
    this.isTyping = true
    let charIndex = 0

    const timer = this.time.addEvent({
      delay: 15,
      repeat: fullText.length,
      callback: () => {
        if (charIndex < fullText.length) {
          this.messageText.setText(fullText.substring(0, charIndex + 1))
          charIndex++
        } else {
          this.isTyping = false
          timer.destroy()
        }
      },
    })
  }

  // ────────────────────────────────────────
  // ポインタダウン処理（フェーズごとに分岐）
  // ────────────────────────────────────────
  private handlePointerDown() {
    if (this.isTyping) {
      // タイプライター中は即座に全文表示
      const nodes = this.phase === 'postDelivery' ? this.postDeliveryNodes : ep01Story
      const node = nodes[this.dialogueState.nodeId]
      if (node) {
        this.messageText.setText(node.text)
        this.isTyping = false
      }
      return
    }

    switch (this.phase) {
      case 'dialogue':
        this.advanceDialogue()
        break
      case 'postDelivery':
        this.advancePostDelivery()
        break
      // recipe フェーズではボタンで操作
    }
  }

  private advanceDialogue() {
    const node = ep01Story[this.dialogueState.nodeId]
    if (!node) return

    if (node.nextNodeId === null) {
      // 会話完了 → レシピフェーズへ
      this.transitionToRecipe()
    } else {
      this.dialogueState.nodeId = node.nextNodeId
      this.showCurrentDialogueNode()
    }
  }

  private advancePostDelivery() {
    const node = this.postDeliveryNodes[this.dialogueState.nodeId]
    if (!node) return

    if (node.nextNodeId === null) {
      // 納品後会話完了 → 終了（または最初に戻る）
      this.endPrototype()
    } else {
      this.dialogueState.nodeId = node.nextNodeId
      this.showCurrentDialogueNode()
    }
  }

  // ────────────────────────────────────────
  // フェーズ遷移
  // ────────────────────────────────────────
  private transitionToRecipe() {
    this.phase = 'recipe'
    this.recipePanel.setVisible(true)
    this.reactorPanel.setVisible(true)
    this.nextButton.setVisible(false)
    this.characterContainer.setVisible(false)
    this.speakerNameText.setVisible(false)
    this.moodEmojiText.setVisible(false)
    this.messageText.setVisible(false)

    this.updateRecipePanel()
    this.updateReactorPanel()

    // 泡アニメーション開始
    this.bubbleTimer = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => this.updateBubbles(),
    })
  }

  private transitionToPostDelivery(outcomeGrade: string) {
    this.phase = 'postDelivery'
    this.currentOutcomeGrade = outcomeGrade

    // レシピ・リアクターパネルを非表示
    this.recipePanel.setVisible(false)
    this.reactorPanel.setVisible(false)

    // 会話UIを表示
    this.nextButton.setVisible(true)
    this.characterContainer.setVisible(true)
    this.speakerNameText.setVisible(true)
    this.moodEmojiText.setVisible(true)
    this.messageText.setVisible(true)

    // 納品後会話ノードを取得
    this.postDeliveryNodes = getPostDeliveryNodes(outcomeGrade, 'ep01')
    this.dialogueState.nodeId = getInitialPostDeliveryNodeId(outcomeGrade)

    // キャラクターをガルドに
    this.characterEmoji.setText('🧔')

    this.showCurrentDialogueNode()
  }

  private endPrototype() {
    // プロトタイプ終了：最初からやり直せるようにする
    this.messageText.setText('—— プロトタイプ終了 ——\n\n画面をクリックで最初からやり直せます。')
    this.nextButtonText.setText('RESTART')
    this.nextButton.setVisible(true)
    this.characterContainer.setVisible(false)
    this.speakerNameText.setVisible(false)
    this.moodEmojiText.setVisible(false)

    // 一度だけリセットハンドラを設定
    this.input.off('pointerdown', this.handlePointerDown, this)
    this.input.on('pointerdown', () => {
      this.scene.restart({ gameState: this.state })
    }, this)
  }

  // ────────────────────────────────────────
  // 調合実行
  // ────────────────────────────────────────
  private executeNextStep() {
    if (this.attempt.currentStepIndex >= this.recipe.steps.length) {
      // 全手順完了 → 結果判定 → 納品後会話へ
      this.finishTreatment()
      return
    }

    const currentStep = this.recipe.steps[this.attempt.currentStepIndex]

    // 正解パラメータで自動実行
    const playerParams = { ...currentStep.correctParams }

    // 手順実行アニメーション
    this.tweens.add({
      targets: this.vesselContainer,
      x: { from: this.vesselContainer.x, to: this.vesselContainer.x + 10 },
      duration: 100,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.attempt = executeStep(this.recipe, this.attempt, playerParams)
        this.updateRecipePanel()
        this.updateReactorPanel()

        // 全手順完了チェック
        if (this.attempt.currentStepIndex >= this.recipe.steps.length) {
          this.time.delayedCall(800, () => this.finishTreatment())
        }
      },
    })
  }

  private finishTreatment() {
    this.treatmentResult = executeTreatment(this.attempt, this.recipe)
    const grade = this.treatmentResult.fate.grade
    this.transitionToPostDelivery(grade)
  }

  private resetTreatment() {
    this.attempt = createEmptyAttempt()
    this.updateRecipePanel()
    this.updateReactorPanel()

    const toast = this.add.text(this.scale.width / 2, this.scale.height / 2, 'RESET', {
      fontSize: '28px',
      color: '#f87171',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#0a0a14',
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setDepth(200)

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 50,
      duration: 800,
      onComplete: () => toast.destroy(),
    })
  }

  // ────────────────────────────────────────
  // UI 更新
  // ────────────────────────────────────────
  private updateRecipePanel() {
    // レシピパネルの手順表示を更新（理由は表示しない）
    // 簡易的に再作成
    this.recipePanel.removeAll(true)
    this.createRecipePanel()
    this.recipePanel.setVisible(true)
  }

  private updateReactorPanel() {
    const currentStep = this.recipe.steps[this.attempt.currentStepIndex]
    const isComplete = this.attempt.currentStepIndex >= this.recipe.steps.length

    if (isComplete) {
      this.stepTitleText.setText('ALL STEPS COMPLETE')
      this.stepTitleText.setColor('#4ade80')
    } else if (currentStep) {
      this.stepTitleText.setText(`STEP ${currentStep.id + 1}: ${currentStep.label.toUpperCase()}`)
      this.stepTitleText.setColor('#6effff')
    }

    this.updateLiquid()
    this.updateActionButton()
  }

  private updateLiquid() {
    const vesselW = 100
    const vesselH = 170

    const progressRatio = this.attempt.currentStepIndex / this.recipe.steps.length
    const fillRatio = 0.25 + progressRatio * 0.65

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
      const factor = 0.5 + 0.5 * (i / (layers - 1))
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
        i === layers - 1 ? 10 : 0
      )
    }

    // 液面ハイライト
    this.liquidGraphics.fillStyle(0xffffff, 0.2)
    this.liquidGraphics.fillRect(-vesselW / 2 + 5, liquidY + 2, vesselW - 10, 3)

    // 泡
    this.liquidGraphics.fillStyle(0xffffff, 0.35)
    this.bubbles.forEach((bub) => {
      this.liquidGraphics.fillCircle(bub.x, bub.y, bub.r)
    })
  }

  private updateBubbles() {
    const vesselW = 85
    const vesselH = 170
    const liquidY = vesselH / 2 - vesselH * 0.7

    if (this.bubbles.length < 6 && Math.random() < 0.35) {
      this.bubbles.push({
        x: Phaser.Math.Between(-vesselW / 2 + 8, vesselW / 2 - 8),
        y: vesselH / 2 - 6,
        r: Phaser.Math.Between(2, 4),
        speed: Phaser.Math.FloatBetween(1.5, 3),
        alpha: 0.5,
      })
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]
      b.y -= b.speed
      if (b.y <= liquidY + 3) {
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
      if (text) text.setText('DELIVER')
      if (bg) {
        bg.clear()
        bg.fillStyle(0x059669, 0.95)
        bg.fillRoundedRect(0, 0, btn.width, btn.height, 8)
        bg.lineStyle(2, 0x4ade80, 0.8)
        bg.strokeRoundedRect(0, 0, btn.width, btn.height, 8)
      }
    } else {
      if (text) text.setText('EXECUTE STEP')
      if (bg) {
        bg.clear()
        bg.fillStyle(0x059669, 0.85)
        bg.fillRoundedRect(0, 0, btn.width, btn.height, 8)
        bg.lineStyle(1.5, 0x4ade80, 0.4)
        bg.strokeRoundedRect(0, 0, btn.width, btn.height, 8)
      }
    }
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    this.state?.updateSafeArea(gameSize.width, gameSize.height)
    this.bgGraphics.clear()
    this.drawBackground()
    this.positionNextButton()
    // パネル位置も再計算が必要だが、プロトタイプでは省略
  }

  shutdown() {
    this.scale.off('resize', this.onResize, this)
    this.input.off('pointerdown', this.handlePointerDown, this)
    this.input.keyboard?.removeAllListeners()
    if (this.bubbleTimer) {
      this.bubbleTimer.destroy()
    }
  }
}