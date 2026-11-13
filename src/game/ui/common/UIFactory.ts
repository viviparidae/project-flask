import Phaser from 'phaser'

/**
 * UIFactory — タッチファースト UI 共通ファクトリ
 * rexUI を使用したボタン・パネル・バッジ等の生成
 * ホバー非依存、最小タッチターゲット 48×48dp 確保
 */

export interface ButtonOptions {
  width?: number
  height?: number
  fontSize?: string
  backgroundColor?: number
  textColor?: string
  radius?: number
  onClick: () => void
}

export interface BadgeOptions {
  text: string
  backgroundColor?: number
  textColor?: string
  fontSize?: string
  padding?: { left: number; right: number; top: number; bottom: number }
}

/**
 * タッチ対応ボタン生成（rexUI Label + RoundRectangle）
 * - 最小 48×48dp 確保
 * - ホバーイベント無効化
 * - 押下時のみ視覚フィードバック（alpha 変更）
 */
export function createTouchButton(
  scene: Phaser.Scene,
  text: string,
  options: ButtonOptions,
): Phaser.GameObjects.Container {
  const {
    width = 160,
    height = 56,
    fontSize = '18px',
    backgroundColor = 0x3d4a5c,
    textColor = '#ffffff',
    radius = 10,
    onClick,
  } = options

  const bg = scene.rexUI.add.roundRectangle(0, 0, width, height, radius, backgroundColor)
  const label = scene.add.text(0, 0, text, {
    fontSize,
    color: textColor,
    fontFamily: 'system-ui, sans-serif',
    wordWrap: { width: width - 32 },
    align: 'center',
  })

  const button = scene.rexUI.add.label({
    background: bg,
    text: label,
    space: { left: 16, right: 16, top: 10, bottom: 10 },
  })
    .setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains)
    .on('pointerdown', () => {
      button.setAlpha(0.7)
      onClick()
    })
    .on('pointerup', () => button.setAlpha(1))
    .on('pointerout', () => button.setAlpha(1))
    .on('pointerover', () => {}) // ホバー無効化

  // 最小タッチターゲット保証（CSS px 基準で 48×48）
  button.setSize(Math.max(width, 48), Math.max(height, 48))

  return button
}

/**
 * 選択式ボタン（アクティブ状態切り替え付き）
 */
export function createSelectorButton(
  scene: Phaser.Scene,
  text: string,
  isActive: boolean,
  onClick: () => void,
  options: Partial<ButtonOptions> = {},
): Phaser.GameObjects.Container {
  const activeBg = options.backgroundColor ?? 0x2d6a4f
  const inactiveBg = 0x3d4a5c

  const bg = scene.rexUI.add.roundRectangle(0, 0, 0, 0, 10, isActive ? activeBg : inactiveBg)
  const label = scene.add.text(0, 0, text, {
    fontSize: options.fontSize ?? '16px',
    color: options.textColor ?? '#ffffff',
    fontFamily: 'system-ui, sans-serif',
    align: 'center',
  })

  const button = scene.rexUI.add.label({
    background: bg,
    text: label,
    space: { left: 16, right: 16, top: 10, bottom: 10 },
  })
    .setInteractive(new Phaser.Geom.Rectangle(-80, -28, 160, 56), Phaser.Geom.Rectangle.Contains)
    .on('pointerdown', () => {
      button.setAlpha(0.7)
      onClick()
    })
    .on('pointerup', () => button.setAlpha(1))
    .on('pointerout', () => button.setAlpha(1))
    .on('pointerover', () => {})

  button.setSize(160, 56)

  // アクティブ状態更新メソッドを付与
  ;(button as any).setActive = (active: boolean) => {
    bg.setFillStyle(active ? activeBg : inactiveBg)
  }

  return button
}

/**
 * 等級バッジ生成（PERFECT/GOOD/PARTIAL/DAMAGED/ACCIDENT）
 */
export function createGradeBadge(
  scene: Phaser.Scene,
  grade: 'PERFECT' | 'GOOD' | 'PARTIAL' | 'DAMAGED' | 'ACCIDENT',
): Phaser.GameObjects.Container {
  const gradeConfig: Record<string, { emoji: string; color: number; label: string }> = {
    PERFECT: { emoji: '✨', color: 0x65e6ad, label: 'PERFECT' },
    GOOD: { emoji: '🗡️', color: 0x8bcfef, label: 'GOOD' },
    PARTIAL: { emoji: '⚠️', color: 0xf6c94e, label: 'PARTIAL' },
    DAMAGED: { emoji: '💀', color: 0xf87171, label: 'DAMAGED' },
    ACCIDENT: { emoji: '💥', color: 0xff4444, label: 'ACCIDENT' },
  }

  const cfg = gradeConfig[grade]
  const bg = scene.rexUI.add.roundRectangle(0, 0, 0, 0, 12, cfg.color)
  const emojiText = scene.add.text(0, 0, cfg.emoji, { fontSize: '28px' })
  const labelText = scene.add.text(0, 0, cfg.label, {
    fontSize: '20px',
    color: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
    fontStyle: 'bold',
  })

  return scene.rexUI.add.sizer({ orientation: 'x', space: { left: 16, right: 16, top: 8, bottom: 8, item: 8 } })
    .add(bg)
    .add(emojiText)
    .add(labelText)
    .layout()
}

/**
 * シンプルパネル（背景付きコンテナ）
 */
export function createPanel(
  scene: Phaser.Scene,
  width: number,
  height: number,
  color = 0x16213e,
  alpha = 0.95,
  radius = 16,
): Phaser.GameObjects.Graphics {
  const panel = scene.add.graphics()
  panel.fillStyle(color, alpha)
  panel.fillRoundedRect(-width / 2, -height / 2, width, height, radius)
  return panel
}

/**
 * スクロール可能なテキストエリア（rexUI Scroller）
 */
export function createScrollableText(
  scene: Phaser.Scene,
  text: string,
  width: number,
  height: number,
  options: { fontSize?: string; color?: string; lineHeight?: number } = {},
): Phaser.GameObjects.Container {
  const { fontSize = '18px', color = '#e0e0e0', lineHeight = 28 } = options

  const textObj = scene.add.text(0, 0, text, {
    fontSize,
    color,
    fontFamily: 'system-ui, sans-serif',
    lineSpacing: lineHeight - parseInt(fontSize),
    wordWrap: { width: width - 40 },
  })

  const mask = scene.add.graphics()
  mask.fillRect(-width / 2, -height / 2, width, height)

  const container = scene.add.container(0, 0, [textObj])
  container.setMask(new Phaser.Display.Masks.GeometryMask(scene, mask))

  const scroller = scene.rexUI.add.scroller({
    width,
    height,
    scrollMode: 0, // vertical
    child: {
      child: container,
      mask: mask,
    },
    space: { left: 20, right: 20, top: 20, bottom: 20 },
    slider: {
      track: scene.rexUI.add.roundRectangle(0, 0, 8, 0, 4, 0x3d4a5c, 0.5),
      thumb: scene.rexUI.add.roundRectangle(0, 0, 8, 40, 4, 0x65e6ad),
    },
  })

  return scroller
}

/**
 * グリッドレイアウトヘルパー（セレクタグリッド用）
 */
export function createGridSizer(
  scene: Phaser.Scene,
  columns: number,
  space: { left?: number; right?: number; top?: number; bottom?: number; item?: number } = {},
): Phaser.Structs.Size & { add: (child: Phaser.GameObjects.GameObject, col: number, row: number) => any } {
  return scene.rexUI.add.gridSizer({
    column: columns,
    row: 0, // auto
    space: { left: 8, right: 8, top: 8, bottom: 8, item: 12, ...space },
  })
}