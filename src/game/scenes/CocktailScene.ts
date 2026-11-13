import Phaser from 'phaser'
import {
  INGREDIENT_META,
  type Ingredient,
  type BaseSpirit,
  type Additive,
  type ShakerState,
  createEmptyShaker,
  addIngredient,
  clearShaker,
  doMix,
  doAge,
  calculateProfile,
  type FlavorProfile,
  matchCocktail,
  type MatchResult,
  COCKTAIL_RECIPES_EP01,
  EP01_ORDERS,
  type CustomerOrder,
} from '../../lib/cocktailEngine'
import { GameState } from '../state/GameState'

/**
 * CocktailScene — VA-11 Hall-A スタイル カクテル作成フェーズ
 *
 * 画面構成:
 * ┌─────────────────────────────────────┐
 * │ ヘッダー（HUDSceneが並行表示）       │
 * ├─────────────────────────────────────┤
 * │ 客名 / 注文ヒント                    │
 * ├─────────────────────────────────────┤
 * │     シェイカー（中央・液体アニメ）    │
 * │     量ゲージ・完成度表示             │
 * ├─────────────────────────────────────┤
 * │ 材料パレット（横スクロール）         │
 * │ [基底酒5種] [添加物5種]              │
 * ├─────────────────────────────────────┤
 * │ [ミックス] [エイジ] [クリア]          │
 * └─────────────────────────────────────┘
 */
export class CocktailScene extends Phaser.Scene {
  // 状態
  private shaker: ShakerState = createEmptyShaker()
  private currentOrder: CustomerOrder | null = null
  private profile: FlavorProfile | null = null
  private state!: GameState

  // UI 参照
  private shakerContainer!: Phaser.GameObjects.Container
  private liquidGraphics!: Phaser.GameObjects.Graphics
  private volumeBar!: Phaser.GameObjects.Graphics
  private volumeText!: Phaser.GameObjects.Text
  private completionText!: Phaser.GameObjects.Text
  private colorPreview!: Phaser.GameObjects.Graphics

  private ingredientContainers: Map<Ingredient, Phaser.GameObjects.Container> = new Map()
  private paletteContainer!: Phaser.GameObjects.Container
  private paletteScrollX = 0

  private mixButton!: Phaser.GameObjects.Container
  private ageButton!: Phaser.GameObjects.Container
  private clearButton!: Phaser.GameObjects.Container
  private serveButton!: Phaser.GameObjects.Container

  private orderText!: Phaser.GameObjects.Text
  private customerNameText!: Phaser.GameObjects.Text

  private isAnimating = false
  private lastUpdateTime = 0

  constructor() {
    super({ key: 'CocktailScene' })
  }

  init(data: { gameState: GameState; customerId?: string }) {
    this.state = data.gameState
    const customerId = data.customerId || 'gard'
    this.currentOrder = EP01_ORDERS.find(o => o.customerId === customerId) || EP01_ORDERS[0]
  }

  create() {
    const { width, height } = this.scale

    this.cameras.main.setBackgroundColor('#0d0d1a')
    this.drawBackground()

    // HUDSceneが上部にあるので、その下から開始
    const hudHeight = 60 + this.state.safeArea.top
    let y = hudHeight

    // 客名・注文ヒント
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

    // リサイズ対応
    this.scale.on('resize', this.onResize, this)

    // キーボードショートカット（デバッグ用）
    this.setupKeyboardShortcuts()
  }

  private drawBackground() {
    const { width, height } = this.scale
    const g = this.add.graphics()
    g.fillStyle(0x0d0d1a, 1)
    g.fillRect(0, 0, width, height)
    // 微細なグリッド
    g.lineStyle(1, 0x2a2a4a, 0.15)
    for (let x = 0; x < width; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, height); g.strokePath() }
    for (let y = 0; y < height; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(width, y); g.strokePath() }
  }

  private createOrderHeader(width: number, y: number) {
    const safeL = this.state.safeArea.left
    const safeR = this.state.safeArea.right

    // 客名
    this.customerNameText = this.add.text(safeL + 20, y, this.currentOrder?.customerName || '客', {
      fontSize: '22px',
      color: '#ffd700',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })

    // 注文ヒント
    this.orderText = this.add.text(safeL + 20, y + 30, this.currentOrder?.hintText || '注文を聞いていない', {
      fontSize: '14px',
      color: '#b0c0d0',
      fontFamily: 'system-ui, sans-serif',
      wordWrap: { width: width - safeL - safeR - 40 },
      lineSpacing: 4,
    })
  }

  private createShakerDisplay(width: number, height: number, startY: number) {
    const centerX = width / 2
    const shakerWidth = 120
    const shakerHeight = 240
    const shakerX = centerX
    const shakerY = startY + shakerHeight / 2 + 10

    this.shakerContainer = this.add.container(shakerX, shakerY)

    // シェイカー外枠（ガラス質感）
    const glassBg = this.add.graphics()
    glassBg.lineStyle(3, 0xffffff, 0.3)
    glassBg.fillStyle(0xffffff, 0.05)
    glassBg.fillRoundedRect(-shakerWidth/2, -shakerHeight/2, shakerWidth, shakerHeight, 16)
    glassBg.strokeRoundedRect(-shakerWidth/2, -shakerHeight/2, shakerWidth, shakerHeight, 16)
    // ハイライト
    glassBg.lineStyle(2, 0xffffff, 0.1)
    glassBg.beginPath()
    glassBg.moveTo(-shakerWidth/2 + 10, -shakerHeight/2 + 20)
    glassBg.lineTo(shakerWidth/2 - 10, -shakerHeight/2 + 20)
    glassBg.strokePath()
    this.shakerContainer.add(glassBg)

    // 液体描画用グラフィックス（マスク内）
    this.liquidGraphics = this.add.graphics()
    this.shakerContainer.add(this.liquidGraphics)

    // シェイカー上部の栓
    const stopper = this.add.graphics()
    stopper.fillStyle(0x2a2a3a, 1)
    stopper.fillRoundedRect(-24, -shakerHeight/2 - 12, 48, 16, 8)
    stopper.lineStyle(2, 0xffffff, 0.2)
    stopper.strokeRoundedRect(-24, -shakerHeight/2 - 12, 48, 16, 8)
    this.shakerContainer.add(stopper)

    // 量ゲージ（右側縦バー）
    const gaugeX = shakerX + shakerWidth/2 + 20
    const gaugeY = shakerY - shakerHeight/2
    const gaugeHeight = shakerHeight

    this.volumeBar = this.add.graphics()
    this.volumeBar.x = gaugeX
    this.volumeBar.y = gaugeY

    // ゲージ背景
    const gaugeBg = this.add.graphics()
    gaugeBg.x = gaugeX
    gaugeBg.y = gaugeY
    gaugeBg.fillStyle(0x1a1a2e, 1)
    gaugeBg.fillRoundedRect(-6, 0, 12, gaugeHeight, 6)
    gaugeBg.lineStyle(1, 0x3d4a5c, 0.5)
    gaugeBg.strokeRoundedRect(-6, 0, 12, gaugeHeight, 6)
    // 目盛り
    gaugeBg.lineStyle(1, 0x3d4a5c, 0.3)
    for (let i = 1; i < 10; i++) {
      const gy = gaugeHeight * i / 10
      gaugeBg.beginPath()
      gaugeBg.moveTo(-10, gy)
      gaugeBg.lineTo(-6, gy)
      gaugeBg.strokePath()
    }

    // 量テキスト
    this.volumeText = this.add.text(gaugeX + 20, gaugeY + gaugeHeight/2, '0 ml', {
      fontSize: '13px',
      color: '#8bcfef',
      fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0, 0.5)

    // 完成度テキスト
    this.completionText = this.add.text(centerX, shakerY + shakerHeight/2 + 25, '完成度: —', {
      fontSize: '14px',
      color: '#8899aa',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // 色プレビュー（小円）
    this.colorPreview = this.add.graphics()
    this.colorPreview.x = centerX - 80
    this.colorPreview.y = shakerY + shakerHeight/2 + 25

    // シェイカーラベル
    this.add.text(centerX, startY + 15, '🍸 シェイカー', {
      fontSize: '14px',
      color: '#8899aa',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    // 初回描画
    this.drawLiquid()
  }

  private drawLiquid() {
    const { profile } = this
    const shakerWidth = 110
    const shakerHeight = 220
    const maxVolume = 300 // 最大容量 ml

    this.liquidGraphics.clear()

    if (!profile || profile.volume === 0) {
      // 空のシェイカー - 底にわずかな残液感
      this.liquidGraphics.fillStyle(0x1a1a2e, 1)
      this.liquidGraphics.fillRoundedRect(-shakerWidth/2 + 4, shakerHeight/2 - 8, shakerWidth - 8, 4, 2)
      return
    }

    // 液体高さ（体積に比例）
    const fillRatio = Phaser.Math.Clamp(profile.volume / maxVolume, 0, 1)
    const liquidHeight = shakerHeight * fillRatio
    const liquidY = shakerHeight/2 - liquidHeight

    // 液体本体（グラデーション風：上部明るく）
    const color = parseInt(profile.color.replace('#', ''), 16)
    const r = (color >> 16) & 0xff
    const g = (color >> 8) & 0xff
    const b = color & 0xff

    // 底から上へグラデーション（複数レイヤーで擬似）
    const layers = 6
    for (let i = 0; i < layers; i++) {
      const layerH = liquidHeight / layers
      const layerY = liquidY + i * layerH
      const factor = 0.6 + 0.4 * (i / (layers - 1))
      const layerColor = Phaser.Display.Color.GetColor(
        Math.min(255, r * factor),
        Math.min(255, g * factor),
        Math.min(255, b * factor)
      )
      this.liquidGraphics.fillStyle(layerColor, 0.9)
      this.liquidGraphics.fillRoundedRect(
        -shakerWidth/2 + 4,
        layerY,
        shakerWidth - 8,
        layerH + (i === layers - 1 ? 2 : 0),
        i === layers - 1 ? 4 : 0
      )
    }

    // 液面ハイライト
    this.liquidGraphics.fillStyle(0xffffff, 0.15)
    this.liquidGraphics.fillRect(-shakerWidth/2 + 6, liquidY + 2, shakerWidth - 12, 4)

    // 氷があれば浮遊表示
    if (this.shaker.additiveCounts.ice > 0) {
      this.liquidGraphics.fillStyle(0xa0d0ff, 0.8)
      for (let i = 0; i < Math.min(this.shaker.additiveCounts.ice, 4); i++) {
        const iceX = Phaser.Math.Between(-shakerWidth/2 + 12, shakerWidth/2 - 12)
        const iceY = Phaser.Math.Between(liquidY + 8, shakerHeight/2 - 12)
        const iceSize = Phaser.Math.Between(6, 10)
        this.liquidGraphics.fillRect(iceX, iceY, iceSize, iceSize)
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

    // スクロール可能エリア（マスク）
    const maskGraphics = this.add.graphics()
    maskGraphics.fillStyle(0xffffff, 1)
    maskGraphics.fillRect(0, 0, paletteWidth, rowHeight * 2)
    this.paletteContainer.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGraphics))

    // タッチスクロール
    this.paletteContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, paletteWidth, rowHeight * 2), Phaser.Geom.Rectangle.Contains)
    let dragStartX = 0
    let dragStartScroll = 0
    this.paletteContainer.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      dragStartX = ptr.x
      dragStartScroll = this.paletteScrollX
    })
    this.paletteContainer.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.isDown) {
        const delta = dragStartX - ptr.x
        this.paletteScrollX = Phaser.Math.Clamp(dragStartScroll + delta, 0, Math.max(0, this.getTotalPaletteWidth() - paletteWidth))
        this.updatePalettePositions()
      }
    })

    // 材料データ（基底酒 + 添加物）
    const baseSpirits: BaseSpirit[] = ['adelhyde', 'brandy', 'powderK', 'flanergide', 'karmotrine']
    const additives: Additive[] = ['ice', 'syrup', 'bitters', 'soda', 'energy']

    let x = 0
    const baseY = 0
    const addY = rowHeight

    // 基底酒行
    baseSpirits.forEach((ing, i) => {
      const container = this.createIngredientButton(ing, x + i * (itemSize + itemGap), baseY, itemSize, true)
      this.paletteContainer.add(container)
      this.ingredientContainers.set(ing, container)
    })

    // 添加物行
    additives.forEach((ing, i) => {
      const container = this.createIngredientButton(ing, x + i * (itemSize + itemGap), addY, itemSize, false)
      this.paletteContainer.add(container)
      this.ingredientContainers.set(ing, container)
    })

    // 行ラベル
    this.add.text(safeL - 10, startY + baseY + itemSize/2, '基底酒', {
      fontSize: '11px', color: '#65e6ad', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(1, 0.5)
    this.add.text(safeL - 10, startY + addY + itemSize/2, '添加物', {
      fontSize: '11px', color: '#8bcfef', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(1, 0.5)

    // スクロールヒント
    const hint = this.add.text(width - safeR - 10, startY + rowHeight, '← スクロール →', {
      fontSize: '10px', color: '#556677', fontFamily: 'system-ui, sans-serif',
    }).setOrigin(1, 0.5)
    this.tweens.add({ targets: hint, alpha: 0.3, yoyo: true, repeat: -1, duration: 1000 })
  }

  private getTotalPaletteWidth(): number {
    const itemSize = 72
    const itemGap = 12
    const count = 5 // max of base/additive
    return count * itemSize + (count - 1) * itemGap
  }

  private updatePalettePositions() {
    this.paletteContainer.x = this.state.safeArea.left - this.paletteScrollX
  }

  private createIngredientButton(
    ingredient: Ingredient,
    x: number,
    y: number,
    size: number,
    isBase: boolean
  ): Phaser.GameObjects.Container {
    const meta = INGREDIENT_META[ingredient]
    const container = this.add.container(x + size/2, y + size/2)
    const count = isBase ? this.shaker.baseCounts[ingredient as BaseSpirit] : this.shaker.additiveCounts[ingredient as Additive]

    // 背景
    const bg = this.add.graphics()
    const isEmpty = count === 0
    const fillColor = isEmpty ? 0x1a1a2e : parseInt(meta.color.replace('#', ''), 16)
    const lineColor = isEmpty ? 0x3d4a5c : 0xffffff
    bg.fillStyle(fillColor, isEmpty ? 0.5 : 0.9)
    bg.fillRoundedRect(-size/2, -size/2, size, size, 12)
    bg.lineStyle(2, lineColor, isEmpty ? 0.3 : 0.4)
    bg.strokeRoundedRect(-size/2, -size/2, size, size, 12)
    container.add(bg)

    // アイコン（絵文字で代用）
    const emojis: Record<Ingredient, string> = {
      adelhyde: '🍸', brandy: '🥃', powderK: '🧪', flanergide: '🍋', karmotrine: '💜',
      ice: '🧊', syrup: '🍯', bitters: '🌿', soda: '🥤', energy: '⚡',
    }
    const icon = this.add.text(0, -size/4, emojis[ingredient] || '❓', { fontSize: `${size * 0.45}px` }).setOrigin(0.5)
    container.add(icon)

    // 短縮名
    const nameText = this.add.text(0, size/4 - 4, meta.short, {
      fontSize: '10px', color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
      wordWrap: { width: size - 8 },
    }).setOrigin(0.5)
    container.add(nameText)

    // 個数バッジ
    const countText = this.add.text(size/2 - 6, -size/2 + 6, count > 0 ? String(count) : '', {
      fontSize: '11px', color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
      backgroundColor: '#2d6a4f',
      padding: { x: 4, y: 1 },
    }).setOrigin(1, 0).setVisible(count > 0)
    container.add(countText)

    // インタラクション
    container.setSize(size, size)
    const hitArea = new Phaser.Geom.Rectangle(-size/2, -size/2, size, size)
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => {
        if (!this.isAnimating) {
          container.setScale(0.92)
          this.addIngredientToShaker(ingredient)
        }
      })
      .on('pointerup', () => container.setScale(1))
      .on('pointerout', () => container.setScale(1))
      .on('pointerover', () => {})

    // 長押しで連続投入
    let holdTimer: Phaser.Time.TimerEvent | null = null
    container.on('pointerdown', () => {
      holdTimer = this.time.addEvent({
        delay: 400,
        callback: () => {
          holdTimer = this.time.addEvent({
            delay: 120,
            repeat: -1,
            callback: () => { if (!this.isAnimating) this.addIngredientToShaker(ingredient) }
          })
        }
      })
    })
    container.on('pointerup', () => { if (holdTimer) { holdTimer.destroy(); holdTimer = null } })
    container.on('pointerout', () => { if (holdTimer) { holdTimer.destroy(); holdTimer = null } })

    // リフレッシュ用メソッドを付与
    ;(container as any).refresh = (newCount: number) => {
      countText.setText(newCount > 0 ? String(newCount) : '')
      countText.setVisible(newCount > 0)
      bg.clear()
      const fillColor = newCount === 0 ? 0x1a1a2e : parseInt(meta.color.replace('#', ''), 16)
      const lineColor = newCount === 0 ? 0x3d4a5c : 0xffffff
      bg.fillStyle(fillColor, newCount === 0 ? 0.5 : 0.9)
      bg.fillRoundedRect(-size/2, -size/2, size, size, 12)
      bg.lineStyle(2, lineColor, newCount === 0 ? 0.3 : 0.4)
      bg.strokeRoundedRect(-size/2, -size/2, size, size, 12)
    }

    return container
  }

  private addIngredientToShaker(ingredient: Ingredient) {
    this.shaker = addIngredient(this.shaker, ingredient)
    this.refreshIngredientButton(ingredient)
    this.updateProfile()
    this.drawLiquid()

    // 投入アニメーション（シェイカーに飛ぶ）
    this.animateIngredientDrop(ingredient)
  }

  private animateIngredientDrop(ingredient: Ingredient) {
    const meta = INGREDIENT_META[ingredient]
    const startX = this.ingredientContainers.get(ingredient)?.x || this.scale.width/2
    const startY = this.ingredientContainers.get(ingredient)?.y || this.scale.height/2
    const targetX = this.shakerContainer.x
    const targetY = this.shakerContainer.y - 40

    const particle = this.add.circle(startX, startY, 12, parseInt(meta.color.replace('#', ''), 16), 1)
    particle.setDepth(100)

    this.tweens.add({
      targets: particle,
      x: targetX,
      y: targetY,
      scale: 0,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeIn',
      onComplete: () => particle.destroy(),
    })

    // シェイカー揺れ
    this.tweens.add({
      targets: this.shakerContainer,
      angle: [-2, 2, -1, 1, 0],
      duration: 300,
    })
  }

  private refreshIngredientButton(ingredient: Ingredient) {
    const container = this.ingredientContainers.get(ingredient)
    if (!container) return
    const meta = INGREDIENT_META[ingredient]
    const count = meta.category === 'base'
      ? this.shaker.baseCounts[ingredient as BaseSpirit]
      : this.shaker.additiveCounts[ingredient as Additive]
    ;(container as any).refresh(count)
  }

  private createActionButtons(width: number, height: number) {
    const btnY = height - this.state.safeArea.bottom - 50
    const btnWidth = 130
    const btnHeight = 56
    const gap = 16
    const totalWidth = btnWidth * 4 + gap * 3
    const startX = (width - totalWidth) / 2 + btnWidth / 2

    // ミックス
    this.mixButton = this.createActionButton(
      startX, btnY, btnWidth, btnHeight,
      '🌀 ミックス', '#2d6a4f', () => this.doMixAction()
    )

    // エイジ
    this.ageButton = this.createActionButton(
      startX + btnWidth + gap, btnY, btnWidth, btnHeight,
      '⏳ エイジ', '#8b4513', () => this.doAgeAction()
    )

    // クリア
    this.clearButton = this.createActionButton(
      startX + (btnWidth + gap) * 2, btnY, btnWidth, btnHeight,
      '🗑️ クリア', '#6a1a1a', () => this.doClearAction()
    )

    // 提供（サーブ）
    this.serveButton = this.createActionButton(
      startX + (btnWidth + gap) * 3, btnY, btnWidth, btnHeight,
      '🍸 提供', '#c49060', () => this.serveCocktail()
    )
  }

  private createActionButton(
    x: number, y: number, w: number, h: number,
    label: string, color: string, onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)

    const bg = this.add.graphics()
    bg.fillStyle(parseInt(color.replace('#', ''), 16), 1)
    bg.fillRoundedRect(-w/2, -h/2, w, h, 12)
    container.add(bg)

    const text = this.add.text(0, 0, label, {
      fontSize: '14px', color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)
    container.add(text)

    container.setSize(w, h)
    const hitArea = new Phaser.Geom.Rectangle(-w/2, -h/2, w, h)
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => { container.setAlpha(0.8); onClick() })
      .on('pointerup', () => container.setAlpha(1))
      .on('pointerout', () => container.setAlpha(1))

    return container
  }

  private doMixAction() {
    if (this.isAnimating) return
    this.isAnimating = true

    this.shaker = doMix(this.shaker)
    this.updateProfile()

    // シェイクアニメーション
    this.tweens.add({
      targets: this.shakerContainer,
      x: { from: this.shakerContainer.x, to: this.shakerContainer.x + 30 },
      y: { from: this.shakerContainer.y, to: this.shakerContainer.y - 10 },
      angle: { from: 0, to: 15 },
      duration: 100,
      yoyo: true,
      repeat: 5,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.shakerContainer.x = this.scale.width / 2
        this.shakerContainer.y = this.shakerContainer.y // 元位置
        this.shakerContainer.angle = 0
        this.drawLiquid()
        this.isAnimating = false
      }
    })

    // 液体渦巻きエフェクト
    this.createSwirlEffect()
  }

  private createSwirlEffect() {
    const particles = this.add.graphics()
    particles.setDepth(50)
    const cx = this.shakerContainer.x
    const cy = this.shakerContainer.y
    const color = this.profile?.color || '#ff6b9d'

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const r = 40
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      const dot = this.add.circle(x, y, 4, parseInt(color.replace('#', ''), 16), 0.8)
      dot.setDepth(50)
      this.tweens.add({
        targets: dot,
        x: cx,
        y: cy,
        scale: 0,
        alpha: 0,
        duration: 500,
        delay: i * 30,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      })
    }
    this.time.delayedCall(800, () => particles.destroy())
  }

  private doAgeAction() {
    if (this.isAnimating) return
    this.isAnimating = true

    this.shaker = doAge(this.shaker, 10)
    this.updateProfile()

    // 熟成アニメーション（時間経過エフェクト）
    const timerText = this.add.text(this.shakerContainer.x, this.shakerContainer.y - 80, '⏳ 熟成中...', {
      fontSize: '16px', color: '#f6c94e', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100)

    this.tweens.add({
      targets: timerText,
      alpha: 0,
      y: timerText.y - 30,
      duration: 1500,
      onComplete: () => timerText.destroy(),
    })

    // 色変化アニメーション
    this.tweens.add({
      targets: this.liquidGraphics,
      // 擬似的：再描画で色更新
      duration: 1500,
      onUpdate: () => this.drawLiquid(),
      onComplete: () => {
        this.drawLiquid()
        this.isAnimating = false
      }
    })
  }

  private doClearAction() {
    if (this.isAnimating) return

    this.shaker = clearShaker(this.shaker)
    this.updateProfile()

    // 全ボタンリフレッシュ
    this.ingredientContainers.forEach((container, ing) => {
      const meta = INGREDIENT_META[ing]
      const count = meta.category === 'base'
        ? this.shaker.baseCounts[ing as BaseSpirit]
        : this.shaker.additiveCounts[ing as Additive]
      ;(container as any).refresh(count)
    })

    this.drawLiquid()

    // クリアエフェクト
    const clearText = this.add.text(this.shakerContainer.x, this.shakerContainer.y, '🗑️ クリア', {
      fontSize: '20px', color: '#f87171', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100)
    this.tweens.add({
      targets: clearText,
      alpha: 0, scale: 1.5, y: clearText.y - 40,
      duration: 600, onComplete: () => clearText.destroy(),
    })
  }

  private updateProfile() {
    this.profile = calculateProfile(this.shaker)

    // 量ゲージ更新
    const maxVol = 300
    const ratio = Phaser.Math.Clamp(this.profile.volume / maxVol, 0, 1)
    const gaugeH = 240

    this.volumeBar.clear()
    this.volumeBar.fillStyle(parseInt(this.profile.color.replace('#', ''), 16), 0.9)
    this.volumeBar.fillRoundedRect(-4, gaugeH * (1 - ratio), 8, gaugeH * ratio, 4)

    this.volumeText.setText(`${this.profile.volume} ml`)

    // 完成度表示（レシピがある場合のみ概算）
    if (this.currentOrder) {
      const recipe = COCKTAIL_RECIPES_EP01.find(r => r.id === this.currentOrder!.hiddenRecipeId)
      if (recipe) {
        const match = matchCocktail(this.shaker, [recipe])
        const pct = Math.round(match.score * 100)
        this.completionText.setText(`完成度: ${pct}%`)
        this.completionText.setColor(match.grade === 'PERFECT' ? '#65e6ad' : match.grade === 'GOOD' ? '#8bcfef' : '#f87171')
      } else {
        this.completionText.setText('完成度: —')
        this.completionText.setColor('#8899aa')
      }
    }

    // 色プレビュー
    this.colorPreview.clear()
    this.colorPreview.fillStyle(parseInt(this.profile.color.replace('#', ''), 16), 1)
    this.colorPreview.fillCircle(0, 0, 12)
    this.colorPreview.lineStyle(2, 0xffffff, 0.3)
    this.colorPreview.strokeCircle(0, 0, 12)
  }

  private setupKeyboardShortcuts() {
    // デバッグ: 数字キーで材料投入
    const bases: BaseSpirit[] = ['adelhyde', 'brandy', 'powderK', 'flanergide', 'karmotrine']
    const adds: Additive[] = ['ice', 'syrup', 'bitters', 'soda', 'energy']

    bases.forEach((b, i) => {
      this.input.keyboard?.on(`keydown-${i + 1}`, () => { if (!this.isAnimating) this.addIngredientToShaker(b) })
    })
    adds.forEach((a, i) => {
      this.input.keyboard?.on(`keydown-${i === 9 ? 0 : i + 1}`, () => { if (!this.isAnimating) this.addIngredientToShaker(a) })
    })

    this.input.keyboard?.on('keydown-M', () => this.doMixAction())
    this.input.keyboard?.on('keydown-A', () => this.doAgeAction())
    this.input.keyboard?.on('keydown-C', () => this.doClearAction())
    this.input.keyboard?.on('keydown-S', () => this.serveCocktail())
  }

  // 提供判定（後でボタンやジェスチャーで呼ぶ）
  serveCocktail(): MatchResult | null {
    if (!this.currentOrder) return null
    const recipe = COCKTAIL_RECIPES_EP01.find(r => r.id === this.currentOrder!.hiddenRecipeId)
    if (!recipe) return null

    const result = matchCocktail(this.shaker, [recipe])

    // 結果表示 → ResultScene または DialogueScene へ
    this.scene.start('CocktailResultScene', {
      outcome: result,
      profile: this.profile,
      order: this.currentOrder,
      shaker: this.shaker,
      gameState: this.state,
    })
    return result
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    this.state.updateSafeArea(gameSize.width, gameSize.height)
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height)
    // 再レイアウトが必要なら create() 再実行や位置調整を行う
  }

  shutdown() {
    this.scale.off('resize', this.onResize, this)
    this.input.keyboard?.removeAllListeners()
  }
}