import Phaser from 'phaser'
import {
  PARAM_GROUPS,
  PARAM_ORDER,
  createEmptyAttempt,
  applyTypeChoice,
  applyQtyChoice,
  executeTreatment,
  REQUEST_CARD,
  GRADE_EMOJIS,
  type RecipeAttempt,
} from '../../lib/treatmentEngine'
import { GameState } from '../state/GameState'

/**
 * LabSceneVA11 — VA-11 Hall-A 風ビジュアル × 化学処置ロジック
 *
 * 見た目: VA-11 Hall-A のカクテル作成画面
 * 中身: 古剣腐食除去処置（試薬選択・条件設定・実行）
 *
 * 画面構成:
 * ┌─────────────────────────────────────┐
 * │ HUD（評判・所持金）                  │
 * ├─────────────────────────────────────┤
 * │ 依頼カード：客名・注文ヒント           │
 * ├─────────────────────────────────────┤
 * │     🍸 シェイカー（中央・液体アニメ）   │
 * │     量ゲージ・完成度表示              │
 * ├─────────────────────────────────────┤
 * │ 材料パレット（横スクロール2行）       │
 * │ [試薬3種] [条件5種]                   │
 * ├─────────────────────────────────────┤
 * │ [🗡️ 実行] [🔄 リセット] [👁️ プレビュー] │
 * └─────────────────────────────────────┘
 */

// 試薬・条件の表示用マッピング（VA-11 風の名前に見せかけ）
const DISPLAY_INGREDIENTS = {
  // 基底酒スロット → 試薬の種類
  bases: [
    { id: 'acid_HCl', label: '塩酸', short: 'HCl', color: '#ff6b6b', emoji: '🧪', category: 'acid' },
    { id: 'acid_Citric', label: 'クエン酸', short: 'クエン', color: '#ffd93d', emoji: '🍋', category: 'acid' },
    { id: 'acid_Phosphoric', label: 'リン酸', short: 'リン酸', color: '#6bcb77', emoji: '🧬', category: 'acid' },
    { id: 'conc', label: '濃度調整', short: '濃度', color: '#4d96ff', emoji: '📊', category: 'conc' },
    { id: 'temp', label: '温度調整', short: '温度', color: '#ff9f43', emoji: '🌡️', category: 'temp' },
  ],
  // 添加物スロット → 手順・条件
  additives: [
    { id: 'proc', label: '手順選択', short: '手順', color: '#a55eea', emoji: '📋', category: 'proc' },
    { id: 'reaction', label: '反応時間', short: '反応', color: '#00d2d3', emoji: '⏱️', category: 'reaction' },
    { id: 'filtration', label: '濾過方法', short: '濾過', color: '#ffffff', emoji: '🔬', category: 'filtration' },
    { id: 'qty_acid', label: '試薬量', short: '量', color: '#ff6b6b', emoji: '💧', category: 'qty' },
    { id: 'qty_cond', label: '条件量', short: '量', color: '#4d96ff', emoji: '📏', category: 'qty' },
  ],
} as const

type DisplayIngredient = typeof DISPLAY_INGREDIENTS.bases[number] | typeof DISPLAY_INGREDIENTS.additives[number]
type IngredientId = DisplayIngredient['id']

export class LabSceneVA11 extends Phaser.Scene {
  // 状態
  private attempt: RecipeAttempt = createEmptyAttempt()
  private profile: { color: string; volume: number; grade: string; matchScore: number } | null = null
  private state!: GameState

  // UI 参照
  private shakerContainer!: Phaser.GameObjects.Container
  private liquidGraphics!: Phaser.GameObjects.Graphics
  private volumeBar!: Phaser.GameObjects.Graphics
  private volumeText!: Phaser.GameObjects.Text
  private completionText!: Phaser.GameObjects.Text
  private colorPreview!: Phaser.GameObjects.Graphics

  private ingredientContainers: Map<IngredientId, Phaser.GameObjects.Container> = new Map()
  private paletteContainer!: Phaser.GameObjects.Container
  private paletteScrollX = 0

  private executeButton!: Phaser.GameObjects.Container
  private resetButton!: Phaser.GameObjects.Container
  private previewButton!: Phaser.GameObjects.Container

  private orderText!: Phaser.GameObjects.Text
  private customerNameText!: Phaser.GameObjects.Text

  private isAnimating = false
  private currentPreviewGrade = ''

  constructor() {
    super({ key: 'LabSceneVA11' })
  }

  init(data: { gameState: GameState }) {
    this.state = data.gameState
  }

  create() {
    const { width, height } = this.scale

    this.cameras.main.setBackgroundColor('#0d0d1a')
    this.drawBackground()

    const hudHeight = 60 + this.state.safeArea.top
    let y = hudHeight

    // 客名・注文ヒント（依頼カード風）
    this.createOrderHeader(width, y)
    y += 80

    // シェイカー中央表示
    this.createShakerDisplay(width, height, y)
    y += 280

    // 材料パレット（横スクロール）
    this.createIngredientPalette(width, height, y)
    y += 140

    // 操作ボタン行
    this.createActionButtons(width, height)

    // 初期プロファイル計算
    this.updateProfile()

    this.scale.on('resize', this.onResize, this)
    this.setupKeyboardShortcuts()
  }

  private drawBackground() {
    const { width, height } = this.scale
    const g = this.add.graphics()
    g.fillStyle(0x0d0d1a, 1)
    g.fillRect(0, 0, width, height)
    g.lineStyle(1, 0x2a2a4a, 0.15)
    for (let x = 0; x < width; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, height); g.strokePath() }
    for (let y = 0; y < height; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(width, y); g.strokePath() }
  }

  private createOrderHeader(width: number, y: number) {
    const safeL = this.state.safeArea.left
    const safeR = this.state.safeArea.right

    this.customerNameText = this.add.text(safeL + 20, y, 'ガルド（鍛冶師）', {
      fontSize: '22px', color: '#ffd700', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    })

    this.orderText = this.add.text(safeL + 20, y + 30, '「親父の形見の剣だ。港町の塩害で錆びきってる……なんとかならんか？」', {
      fontSize: '14px', color: '#b0c0d0', fontFamily: 'system-ui, sans-serif',
      wordWrap: { width: width - safeL - safeR - 40 }, lineSpacing: 4,
    })
  }

  private createShakerDisplay(width: number, height: number, startY: number) {
    const centerX = width / 2
    const shakerWidth = 120
    const shakerHeight = 240
    const shakerX = centerX
    const shakerY = startY + shakerHeight / 2 + 10

    this.shakerContainer = this.add.container(shakerX, shakerY)

    // シェイカー外枠
    const glassBg = this.add.graphics()
    glassBg.lineStyle(3, 0xffffff, 0.3)
    glassBg.fillStyle(0xffffff, 0.05)
    glassBg.fillRoundedRect(-shakerWidth/2, -shakerHeight/2, shakerWidth, shakerHeight, 16)
    glassBg.strokeRoundedRect(-shakerWidth/2, -shakerHeight/2, shakerWidth, shakerHeight, 16)
    glassBg.lineStyle(2, 0xffffff, 0.1)
    glassBg.beginPath()
    glassBg.moveTo(-shakerWidth/2 + 10, -shakerHeight/2 + 20)
    glassBg.lineTo(shakerWidth/2 - 10, -shakerHeight/2 + 20)
    glassBg.strokePath()
    this.shakerContainer.add(glassBg)

    this.liquidGraphics = this.add.graphics()
    this.shakerContainer.add(this.liquidGraphics)

    const stopper = this.add.graphics()
    stopper.fillStyle(0x2a2a3a, 1)
    stopper.fillRoundedRect(-24, -shakerHeight/2 - 12, 48, 16, 8)
    stopper.lineStyle(2, 0xffffff, 0.2)
    stopper.strokeRoundedRect(-24, -shakerHeight/2 - 12, 48, 16, 8)
    this.shakerContainer.add(stopper)

    // 量ゲージ
    const gaugeX = shakerX + shakerWidth/2 + 20
    const gaugeY = shakerY - shakerHeight/2
    const gaugeHeight = shakerHeight

    this.volumeBar = this.add.graphics()
    this.volumeBar.x = gaugeX
    this.volumeBar.y = gaugeY

    const gaugeBg = this.add.graphics()
    gaugeBg.x = gaugeX
    gaugeBg.y = gaugeY
    gaugeBg.fillStyle(0x1a1a2e, 1)
    gaugeBg.fillRoundedRect(-6, 0, 12, gaugeHeight, 6)
    gaugeBg.lineStyle(1, 0x3d4a5c, 0.5)
    gaugeBg.strokeRoundedRect(-6, 0, 12, gaugeHeight, 6)
    gaugeBg.lineStyle(1, 0x3d4a5c, 0.3)
    for (let i = 1; i < 10; i++) {
      const gy = gaugeHeight * i / 10
      gaugeBg.beginPath(); gaugeBg.moveTo(-10, gy); gaugeBg.lineTo(-6, gy); gaugeBg.strokePath()
    }

    this.volumeText = this.add.text(gaugeX + 20, gaugeY + gaugeHeight/2, '0 ml', {
      fontSize: '13px', color: '#8bcfef', fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0, 0.5)

    this.completionText = this.add.text(centerX, shakerY + shakerHeight/2 + 25, '予測等級: —', {
      fontSize: '14px', color: '#8899aa', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)

    this.colorPreview = this.add.graphics()
    this.colorPreview.x = centerX - 80
    this.colorPreview.y = shakerY + shakerHeight/2 + 25

    this.add.text(centerX, startY + 15, '🧪 処置液調合器', {
      fontSize: '14px', color: '#8899aa', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)

    this.drawLiquid()
  }

  private drawLiquid() {
    const shakerWidth = 110
    const shakerHeight = 220
    const maxVolume = 300

    this.liquidGraphics.clear()

    if (!this.profile || this.profile.volume === 0) {
      this.liquidGraphics.fillStyle(0x1a1a2e, 1)
      this.liquidGraphics.fillRoundedRect(-shakerWidth/2 + 4, shakerHeight/2 - 8, shakerWidth - 8, 4, 2)
      return
    }

    const fillRatio = Phaser.Math.Clamp(this.profile.volume / maxVolume, 0, 1)
    const liquidHeight = shakerHeight * fillRatio
    const liquidY = shakerHeight/2 - liquidHeight

    const color = parseInt(this.profile.color.replace('#', ''), 16)
    const r = (color >> 16) & 0xff
    const g = (color >> 8) & 0xff
    const b = color & 0xff

    const layers = 6
    for (let i = 0; i < layers; i++) {
      const layerH = liquidHeight / layers
      const layerY = liquidY + i * layerH
      const factor = 0.6 + 0.4 * (i / (layers - 1))
      const layerColor = Phaser.Display.Color.GetColor(
        Math.min(255, r * factor), Math.min(255, g * factor), Math.min(255, b * factor)
      )
      this.liquidGraphics.fillStyle(layerColor, 0.9)
      this.liquidGraphics.fillRoundedRect(
        -shakerWidth/2 + 4, layerY, shakerWidth - 8,
        layerH + (i === layers - 1 ? 2 : 0), i === layers - 1 ? 4 : 0
      )
    }

    this.liquidGraphics.fillStyle(0xffffff, 0.15)
    this.liquidGraphics.fillRect(-shakerWidth/2 + 6, liquidY + 2, shakerWidth - 12, 4)

    // 試薬量に応じた粒子表示
    if ((this.attempt.acidQty === 'large' || this.attempt.concentrationQty === 'high')) {
      this.liquidGraphics.fillStyle(0xffffff, 0.3)
      for (let i = 0; i < 6; i++) {
        const px = Phaser.Math.Between(-shakerWidth/2 + 12, shakerWidth/2 - 12)
        const py = Phaser.Math.Between(liquidY + 8, shakerHeight/2 - 12)
        this.liquidGraphics.fillCircle(px, py, Phaser.Math.Between(2, 4))
      }
    }
  }

  private createIngredientPalette(width: number, height: number, startY: number) {
    const safeL = this.state.safeArea.left
    const safeR = this.state.safeArea.right
    const paletteWidth = width - safeL - safeR
    const itemSize = 72
    const itemGap = 12
    const rowHeight = 84

    this.paletteContainer = this.add.container(safeL, startY)

    const maskGraphics = this.add.graphics()
    maskGraphics.fillStyle(0xffffff, 1)
    maskGraphics.fillRect(0, 0, paletteWidth, rowHeight * 2)
    this.paletteContainer.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGraphics))

    this.paletteContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, paletteWidth, rowHeight * 2), Phaser.Geom.Rectangle.Contains)
    let dragStartX = 0, dragStartScroll = 0
    this.paletteContainer.on('pointerdown', (ptr: Phaser.Input.Pointer) => { dragStartX = ptr.x; dragStartScroll = this.paletteScrollX })
    this.paletteContainer.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.isDown) {
        const delta = dragStartX - ptr.x
        this.paletteScrollX = Phaser.Math.Clamp(dragStartScroll + delta, 0, Math.max(0, this.getTotalPaletteWidth() - paletteWidth))
        this.updatePalettePositions()
      }
    })

    let x = 0
    const baseY = 0
    const addY = rowHeight

    // 試薬行
    DISPLAY_INGREDIENTS.bases.forEach((ing, i) => {
      const container = this.createIngredientButton(ing, x + i * (itemSize + itemGap), baseY, itemSize)
      this.paletteContainer.add(container)
      this.ingredientContainers.set(ing.id, container)
    })

    // 条件行
    DISPLAY_INGREDIENTS.additives.forEach((ing, i) => {
      const container = this.createIngredientButton(ing, x + i * (itemSize + itemGap), addY, itemSize)
      this.paletteContainer.add(container)
      this.ingredientContainers.set(ing.id, container)
    })

    // 行ラベル
    this.add.text(safeL - 10, startY + baseY + itemSize/2, '試薬選択', {
      fontSize: '11px', color: '#65e6ad', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(1, 0.5)
    this.add.text(safeL - 10, startY + addY + itemSize/2, '条件設定', {
      fontSize: '11px', color: '#8bcfef', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(1, 0.5)

    const hint = this.add.text(width - safeR - 10, startY + rowHeight, '← スクロール →', {
      fontSize: '10px', color: '#556677', fontFamily: 'system-ui, sans-serif',
    }).setOrigin(1, 0.5)
    this.tweens.add({ targets: hint, alpha: 0.3, yoyo: true, repeat: -1, duration: 1000 })
  }

  private getTotalPaletteWidth(): number {
    const itemSize = 72, itemGap = 12, count = 5
    return count * itemSize + (count - 1) * itemGap
  }

  private updatePalettePositions() {
    this.paletteContainer.x = this.state.safeArea.left - this.paletteScrollX
  }

  private createIngredientButton(ingredient: DisplayIngredient, x: number, y: number, size: number): Phaser.GameObjects.Container {
    const container = this.add.container(x + size/2, y + size/2)
    const count = this.getIngredientCount(ingredient.id)

    const bg = this.add.graphics()
    const isEmpty = count === 0
    const fillColor = isEmpty ? 0x1a1a2e : parseInt(ingredient.color.replace('#', ''), 16)
    const lineColor = isEmpty ? 0x3d4a5c : 0xffffff
    bg.fillStyle(fillColor, isEmpty ? 0.5 : 0.9)
    bg.fillRoundedRect(-size/2, -size/2, size, size, 12)
    bg.lineStyle(2, lineColor, isEmpty ? 0.3 : 0.4)
    bg.strokeRoundedRect(-size/2, -size/2, size, size, 12)
    container.add(bg)

    const icon = this.add.text(0, -size/4, ingredient.emoji, { fontSize: `${size * 0.45}px` }).setOrigin(0.5)
    container.add(icon)

    const nameText = this.add.text(0, size/4 - 4, ingredient.short, {
      fontSize: '10px', color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
      wordWrap: { width: size - 8 },
    }).setOrigin(0.5)
    container.add(nameText)

    const countText = this.add.text(size/2 - 6, -size/2 + 6, count > 0 ? String(count) : '', {
      fontSize: '11px', color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
      backgroundColor: '#2d6a4f', padding: { x: 4, y: 1 },
    }).setOrigin(1, 0).setVisible(count > 0)
    container.add(countText)

    container.setSize(size, size)
    const hitArea = new Phaser.Geom.Rectangle(-size/2, -size/2, size, size)
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => { if (!this.isAnimating) { container.setScale(0.92); this.addIngredient(ingredient.id) } })
      .on('pointerup', () => container.setScale(1))
      .on('pointerout', () => container.setScale(1))

    let holdTimer: Phaser.Time.TimerEvent | null = null
    container.on('pointerdown', () => {
      holdTimer = this.time.addEvent({ delay: 400, callback: () => {
        holdTimer = this.time.addEvent({ delay: 120, repeat: -1, callback: () => { if (!this.isAnimating) this.addIngredient(ingredient.id) } })
      }})
    })
    container.on('pointerup', () => { if (holdTimer) { holdTimer.destroy(); holdTimer = null } })
    container.on('pointerout', () => { if (holdTimer) { holdTimer.destroy(); holdTimer = null } })

    ;(container as any).refresh = (newCount: number) => {
      countText.setText(newCount > 0 ? String(newCount) : '')
      countText.setVisible(newCount > 0)
      bg.clear()
      const fc = newCount === 0 ? 0x1a1a2e : parseInt(ingredient.color.replace('#', ''), 16)
      const lc = newCount === 0 ? 0x3d4a5c : 0xffffff
      bg.fillStyle(fc, newCount === 0 ? 0.5 : 0.9)
      bg.fillRoundedRect(-size/2, -size/2, size, size, 12)
      bg.lineStyle(2, lc, newCount === 0 ? 0.3 : 0.4)
      bg.strokeRoundedRect(-size/2, -size/2, size, size, 12)
    }

    return container
  }

  private getIngredientCount(id: IngredientId): number {
    switch (id) {
      case 'acid_HCl': return this.attempt.acid === 'HCl' ? 1 : 0
      case 'acid_Citric': return this.attempt.acid === 'Citric' ? 1 : 0
      case 'acid_Phosphoric': return this.attempt.acid === 'Phosphoric' ? 1 : 0
      case 'conc': return this.attempt.concentration !== 'light' ? 1 : 0
      case 'temp': return this.attempt.temperature !== 'cold' ? 1 : 0
      case 'proc': return this.attempt.procedure !== 'quick' ? 1 : 0
      case 'reaction': return this.attempt.reaction !== 'quick' ? 1 : 0
      case 'filtration': return this.attempt.filtration !== 'quick' ? 1 : 0
      case 'qty_acid': return this.attempt.acidQty === 'large' ? 2 : this.attempt.acidQty === 'medium' ? 1 : 0
      case 'qty_cond': return this.attempt.concentrationQty === 'high' ? 2 : this.attempt.concentrationQty === 'medium' ? 1 : 0
      default: return 0
    }
  }

  private addIngredient(id: IngredientId) {
    const oldAttempt = { ...this.attempt }

    switch (id) {
      case 'acid_HCl': this.attempt = applyTypeChoice(this.attempt, 'acid', 'HCl'); break
      case 'acid_Citric': this.attempt = applyTypeChoice(this.attempt, 'acid', 'Citric'); break
      case 'acid_Phosphoric': this.attempt = applyTypeChoice(this.attempt, 'acid', 'Phosphoric'); break
      case 'conc': this.cycleConcentration(); break
      case 'temp': this.cycleTemperature(); break
      case 'proc': this.cycleProcedure(); break
      case 'reaction': this.cycleReaction(); break
      case 'filtration': this.cycleFiltration(); break
      case 'qty_acid': this.cycleAcidQty(); break
      case 'qty_cond': this.cycleCondQty(); break
    }

    this.refreshAllButtons()
    this.updateProfile()
    this.drawLiquid()
    this.animateDrop(id)
  }

  private cycleConcentration() {
    const order: Array<'light'|'standard'|'strong'> = ['light', 'standard', 'strong']
    const idx = order.indexOf(this.attempt.concentration)
    this.attempt = applyTypeChoice(this.attempt, 'concentration', order[(idx + 1) % 3])
  }
  private cycleTemperature() {
    const order: Array<'cold'|'warm'|'hot'> = ['cold', 'warm', 'hot']
    const idx = order.indexOf(this.attempt.temperature)
    this.attempt = applyTypeChoice(this.attempt, 'temperature', order[(idx + 1) % 3])
  }
  private cycleProcedure() {
    const order: Array<'quick'|'standard'> = ['quick', 'standard']
    const idx = order.indexOf(this.attempt.procedure)
    this.attempt = applyTypeChoice(this.attempt, 'procedure', order[(idx + 1) % 2])
  }
  private cycleReaction() {
    const order: Array<'quick'|'standard'> = ['quick', 'standard']
    const idx = order.indexOf(this.attempt.reaction)
    this.attempt = applyTypeChoice(this.attempt, 'reaction', order[(idx + 1) % 2])
  }
  private cycleFiltration() {
    const order: Array<'quick'|'standard'> = ['quick', 'standard']
    const idx = order.indexOf(this.attempt.filtration)
    this.attempt = applyTypeChoice(this.attempt, 'filtration', order[(idx + 1) % 2])
  }
  private cycleAcidQty() {
    const order: Array<'small'|'medium'|'large'> = ['small', 'medium', 'large']
    const idx = order.indexOf(this.attempt.acidQty)
    this.attempt = applyQtyChoice(this.attempt, 'acid', order[(idx + 1) % 3])
  }
  private cycleCondQty() {
    const order: Array<'low'|'medium'|'high'> = ['low', 'medium', 'high']
    const idx = order.indexOf(this.attempt.concentrationQty)
    this.attempt = applyQtyChoice(this.attempt, 'concentration', order[(idx + 1) % 3])
  }

  private refreshAllButtons() {
    this.ingredientContainers.forEach((container, id) => {
      const count = this.getIngredientCount(id)
      ;(container as any).refresh(count)
    })
  }

  private animateDrop(id: IngredientId) {
    const container = this.ingredientContainers.get(id)
    if (!container) return
    const ingredient = [...DISPLAY_INGREDIENTS.bases, ...DISPLAY_INGREDIENTS.additives].find(i => i.id === id)
    if (!ingredient) return

    const startX = container.x + this.paletteContainer.x
    const startY = container.y + this.paletteContainer.y
    const targetX = this.shakerContainer.x
    const targetY = this.shakerContainer.y - 40

    const particle = this.add.circle(startX, startY, 12, parseInt(ingredient.color.replace('#', ''), 16), 1)
    particle.setDepth(100)
    this.tweens.add({
      targets: particle, x: targetX, y: targetY, scale: 0, alpha: 0, duration: 400, ease: 'Cubic.easeIn',
      onComplete: () => particle.destroy(),
    })
    this.tweens.add({ targets: this.shakerContainer, angle: [-2, 2, -1, 1, 0], duration: 300 })
  }

  private createActionButtons(width: number, height: number) {
    const btnY = height - this.state.safeArea.bottom - 50
    const btnWidth = 140
    const btnHeight = 56
    const gap = 20
    const totalWidth = btnWidth * 3 + gap * 2
    const startX = (width - totalWidth) / 2 + btnWidth / 2

    this.executeButton = this.createActionButton(startX, btnY, btnWidth, btnHeight, '🗡️ 実行', '#2d6a4f', () => this.executeTreatment())
    this.resetButton = this.createActionButton(startX + btnWidth + gap, btnY, btnWidth, btnHeight, '🔄 リセット', '#6a1a1a', () => this.resetTreatment())
    this.previewButton = this.createActionButton(startX + (btnWidth + gap) * 2, btnY, btnWidth, btnHeight, '👁️ プレビュー', '#c49060', () => this.showFullPreview())
  }

  private createActionButton(x: number, y: number, w: number, h: number, label: string, color: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    const bg = this.add.graphics()
    bg.fillStyle(parseInt(color.replace('#', ''), 16), 1)
    bg.fillRoundedRect(-w/2, -h/2, w, h, 12)
    container.add(bg)
    const text = this.add.text(0, 0, label, { fontSize: '14px', color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold' }).setOrigin(0.5)
    container.add(text)
    container.setSize(w, h)
    const hitArea = new Phaser.Geom.Rectangle(-w/2, -h/2, w, h)
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => { container.setAlpha(0.8); onClick() })
      .on('pointerup', () => container.setAlpha(1))
      .on('pointerout', () => container.setAlpha(1))
    return container
  }

  private updateProfile() {
    // treatmentEngine の executeTreatment を使ってプレビュー計算
    const result = executeTreatment(this.attempt)
    const reaction = result.reactionResult
    const recipeResult = result.recipeResult

    // 液体色を計算（試薬に基づく）
    const acidColors: Record<string, string> = { HCl: '#ff6b6b', Citric: '#ffd93d', Phosphoric: '#6bcb77' }
    const baseColor = acidColors[this.attempt.acid] || '#6bcb77'
    const intensity = this.attempt.acidQty === 'large' ? 1.0 : this.attempt.acidQty === 'medium' ? 0.7 : 0.4
    const color = this.adjustColorBrightness(baseColor, intensity)

    this.profile = {
      color,
      volume: 100 + (this.attempt.acidQty === 'large' ? 80 : this.attempt.acidQty === 'medium' ? 50 : 20) +
                    (this.attempt.concentrationQty === 'high' ? 40 : this.attempt.concentrationQty === 'medium' ? 25 : 10),
      grade: recipeResult.grade,
      matchScore: recipeResult.matchScore,
    }

    // 量ゲージ
    const maxVol = 300, ratio = Phaser.Math.Clamp(this.profile.volume / maxVol, 0, 1), gaugeH = 240
    this.volumeBar.clear()
    this.volumeBar.fillStyle(parseInt(this.profile.color.replace('#', ''), 16), 0.9)
    this.volumeBar.fillRoundedRect(-4, gaugeH * (1 - ratio), 8, gaugeH * ratio, 4)
    this.volumeText.setText(`${this.profile.volume} ml`)

    // 完成度表示
    const gradeColors: Record<string, string> = { PERFECT: '#65e6ad', GOOD: '#8bcfef', PARTIAL: '#f6c94e', DAMAGED: '#f87171', ACCIDENT: '#f87171' }
    this.completionText.setText(`予測等級: ${this.profile.grade} (一致: ${this.profile.matchScore}/6)`)
    this.completionText.setColor(gradeColors[this.profile.grade] || '#8899aa')

    // 色プレビュー
    this.colorPreview.clear()
    this.colorPreview.fillStyle(parseInt(this.profile.color.replace('#', ''), 16), 1)
    this.colorPreview.fillCircle(0, 0, 12)
    this.colorPreview.lineStyle(2, 0xffffff, 0.3)
    this.colorPreview.strokeCircle(0, 0, 12)
  }

  private adjustColorBrightness(hex: string, factor: number): string {
    const color = parseInt(hex.replace('#', ''), 16)
    const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor))
    const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor))
    const b = Math.min(255, Math.round((color & 0xff) * factor))
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
  }

  private executeTreatment() {
    if (this.isAnimating) return
    this.isAnimating = true

    const result = executeTreatment(this.attempt)

    // シェイクアニメーション
    this.tweens.add({
      targets: this.shakerContainer,
      x: { from: this.shakerContainer.x, to: this.shakerContainer.x + 30 },
      y: { from: this.shakerContainer.y, to: this.shakerContainer.y - 10 },
      angle: { from: 0, to: 15 },
      duration: 100, yoyo: true, repeat: 5, ease: 'Sine.easeInOut',
      onComplete: () => {
        this.shakerContainer.x = this.scale.width / 2
        this.shakerContainer.angle = 0
        this.drawLiquid()
        this.isAnimating = false
        // 結果シーンへ
        this.scene.start('ResultScene', {
          outcome: result.fate,
          reaction: result.reactionResult,
          attempt: this.attempt,
        })
      }
    })

    this.createSwirlEffect(result)
  }

  private createSwirlEffect(result: any) {
    const cx = this.shakerContainer.x, cy = this.shakerContainer.y
    const color = this.profile?.color || '#6bcb77'
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const r = 40
      const dot = this.add.circle(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 4, parseInt(color.replace('#', ''), 16), 0.8)
      dot.setDepth(50)
      this.tweens.add({ targets: dot, x: cx, y: cy, scale: 0, alpha: 0, duration: 500, delay: i * 30, ease: 'Cubic.easeOut', onComplete: () => dot.destroy() })
    }
  }

  private resetTreatment() {
    if (this.isAnimating) return
    this.attempt = createEmptyAttempt()
    this.refreshAllButtons()
    this.updateProfile()
    this.drawLiquid()

    const clearText = this.add.text(this.shakerContainer.x, this.shakerContainer.y, '🔄 リセット', { fontSize: '20px', color: '#f87171', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold' }).setOrigin(0.5).setDepth(100)
    this.tweens.add({ targets: clearText, alpha: 0, scale: 1.5, y: clearText.y - 40, duration: 600, onComplete: () => clearText.destroy() })
  }

  private showFullPreview() {
    const result = executeTreatment(this.attempt)
    const reaction = result.reactionResult
    const recipeResult = result.recipeResult
    const fate = result.fate

    // モーダル風プレビュー
    const { width, height } = this.scale
    const modal = this.add.container(width/2, height/2)
    modal.setDepth(200)

    const bg = this.add.graphics()
    bg.fillStyle(0x0f0f1a, 0.98)
    bg.fillRoundedRect(-250, -200, 500, 400, 16)
    bg.lineStyle(2, 0x2d6a4f, 0.5)
    bg.strokeRoundedRect(-250, -200, 500, 400, 16)
    modal.add(bg)

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.5)
    overlay.setDepth(199)
    overlay.setInteractive()
    overlay.on('pointerdown', () => { overlay.destroy(); modal.destroy() })

    const gradeColors: Record<string, number> = { PERFECT: 0x65e6ad, GOOD: 0x8bcfef, PARTIAL: 0xf6c94e, DAMAGED: 0xf87171, ACCIDENT: 0xf87171 }
    const grade = fate.grade
    const emoji = GRADE_EMOJIS[grade] || '💀'

    modal.add(this.add.text(0, -160, `${emoji} 予測結果: ${grade}`, { fontSize: '24px', color: '#' + (gradeColors[grade] || 0xf87171).toString(16).padStart(6, '0'), fontFamily: 'system-ui, sans-serif', fontStyle: 'bold' }).setOrigin(0.5))

    modal.add(this.add.text(0, -110, `一致パラメータ: ${recipeResult.matchScore}/6`, { fontSize: '16px', color: '#8bcfef', fontFamily: 'system-ui, sans-serif' }).setOrigin(0.5))

    const details = [
      `錆除去率: ${reaction.corrosionRemoved}%`,
      `金属侵食: ${reaction.metalDamage > 0 ? reaction.metalDamage + '%' : 'なし'}`,
      `有害副産物: ${reaction.byproductHazard ? '⚠️ 発生の危険あり' : '✅ なし'}`,
      `修復スコア: ${reaction.restorationScore}`,
    ]
    details.forEach((d, i) => {
      modal.add(this.add.text(0, -50 + i * 35, d, { fontSize: '14px', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' }).setOrigin(0.5))
    })

    modal.add(this.add.text(0, 120, fate.resultText.replace(/\\n/g, '\n'), { fontSize: '14px', color: '#b0c0d0', fontFamily: 'system-ui, sans-serif', align: 'center', wordWrap: { width: 440 }, lineSpacing: 6 }).setOrigin(0.5))

    modal.add(this.add.text(0, 180, 'タップで閉じる', { fontSize: '12px', color: '#667788', fontFamily: 'system-ui, sans-serif' }).setOrigin(0.5))
  }

  private setupKeyboardShortcuts() {
    this.input.keyboard?.on('keydown-ONE', () => this.addIngredient('acid_HCl'))
    this.input.keyboard?.on('keydown-TWO', () => this.addIngredient('acid_Citric'))
    this.input.keyboard?.on('keydown-THREE', () => this.addIngredient('acid_Phosphoric'))
    this.input.keyboard?.on('keydown-FOUR', () => this.addIngredient('conc'))
    this.input.keyboard?.on('keydown-FIVE', () => this.addIngredient('temp'))
    this.input.keyboard?.on('keydown-SIX', () => this.addIngredient('proc'))
    this.input.keyboard?.on('keydown-SEVEN', () => this.addIngredient('reaction'))
    this.input.keyboard?.on('keydown-EIGHT', () => this.addIngredient('filtration'))
    this.input.keyboard?.on('keydown-NINE', () => this.addIngredient('qty_acid'))
    this.input.keyboard?.on('keydown-ZERO', () => this.addIngredient('qty_cond'))
    this.input.keyboard?.on('keydown-E', () => this.executeTreatment())
    this.input.keyboard?.on('keydown-R', () => this.resetTreatment())
    this.input.keyboard?.on('keydown-P', () => this.showFullPreview())
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    this.state.updateSafeArea(gameSize.width, gameSize.height)
  }

  shutdown() {
    this.scale.off('resize', this.onResize, this)
    this.input.keyboard?.removeAllListeners()
  }
}