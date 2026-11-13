import Phaser from 'phaser'
import {
  PARAM_GROUPS,
  PARAM_ORDER,
  createEmptyAttempt,
  applyTypeChoice,
  applyQtyChoice,
  getPreviewText,
  executeTreatment,
  REQUEST_CARD,
  GRADE_CONFIG,
  GRADE_EMOJIS,
  type RecipeAttempt,
} from '../../lib/treatmentEngine'
import { GameState } from '../state/GameState'

/**
 * LabSceneV2 — 処置ラボフェーズ（VA-11 Hall-A 風選択グリッド版）
 *
 * 画面構成:
 * ┌─────────────────────────────────────┐
 * │ HUD（評判・所持金）                  │
 * ├─────────────────────────────────────┤
 * │ 依頼カード（タイトル・成分・ヒント）   │
 * ├─────────────────────────────────────┤
 * │ 選択グリッド（左から順次解放）       │
 * │ [試薬] [濃度] [温度] [手順] [反応時間] [濾過] │
 * │ 各：左列=種類 / 右列=量              │
 * ├─────────────────────────────────────┤
 * │ プレビューパネル（等級予測・詳細）     │
 * ├─────────────────────────────────────┤
 * │ [🗡️ 調合を実行する]                  │
 * └─────────────────────────────────────┘
 */
export class LabSceneV2 extends Phaser.Scene {
  // 選択中状態
  private attempt: RecipeAttempt = createEmptyAttempt()

  // UI 参照
  private selectorGroups: Map<string, Phaser.GameObjects.Container> = new Map()
  private previewContainer!: Phaser.GameObjects.Container
  private executeButton!: Phaser.GameObjects.Container
  private gradeText!: Phaser.GameObjects.Text
  private matchScoreText!: Phaser.GameObjects.Text
  private detailTexts: Phaser.GameObjects.Text[] = []
  private isExecuted = false
  private unlockedParams: Set<string> = new Set(['acid'])

  // パラメータ定義（順番に解放） - treatmentEngine から取得
  private paramGroups = PARAM_GROUPS

  constructor() {
    super({ key: 'LabSceneV2' })
  }

  init(data: { gameState: GameState }) {
    // registry から取得するため data は使わない
  }

  create() {
    const { width, height } = this.scale
    const state = this.game.registry.get('gameState') as GameState

    this.drawBackground()

    this.add.text(width / 2, state.safeArea.top + 20, '🔬 処置ラボ', {
      fontSize: '22px', color: '#65e6ad', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, state.safeArea.top + 48, '試薬を選んで順に調合してください', {
      fontSize: '13px', color: '#8899aa', fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    this.createRequestCard()
    this.createSelectorGrid()
    this.createPreviewPanel()
    this.createExecuteButton()
    this.updatePreview()

    this.scale.on('resize', this.onResize, this)
  }

  private drawBackground() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#1a1a2e')
    const g = this.add.graphics()
    g.lineStyle(1, 0x3d4a5c, 0.15)
    for (let x = 0; x < width; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, height); g.strokePath() }
    for (let y = 0; y < height; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(width, y); g.strokePath() }
  }

  private createRequestCard() {
    const { width } = this.scale
    const state = this.game.registry.get('gameState') as GameState
    const recipe = REQUEST_CARD
    const cardX = width / 2
    const cardY = state.safeArea.top + 90

    const bg = this.add.graphics()
    bg.fillStyle(0x16213e, 0.95)
    bg.fillRoundedRect(cardX - 280, cardY - 40, 560, 150, 12)
    bg.lineStyle(2, 0x2d6a4f, 0.5)
    bg.strokeRoundedRect(cardX - 280, cardY - 40, 560, 150, 12)

    this.add.text(cardX, cardY - 18, recipe.name, {
      fontSize: '18px', color: '#65e6ad', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(cardX, cardY + 6, recipe.compound, {
      fontSize: '13px', color: '#8bcfef', fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    const hintX = cardX - 260
    let hintY = cardY + 38
    recipe.hints.forEach((hint) => {
      const tagBg = this.add.graphics()
      tagBg.fillStyle(0x2d6a4f, 0.8)
      const text = this.add.text(hintX, hintY, `★ ${hint}`, {
        fontSize: '11px', color: '#ffffff', fontFamily: 'system-ui, sans-serif', wordWrap: { width: 500 },
      })
      const bounds = text.getBounds()
      tagBg.fillRoundedRect(bounds.x - 5, bounds.y - 2, bounds.width + 10, bounds.height + 4, 5)
      text.setDepth(1)
      hintY += bounds.height + 8
    })
  }

  private createSelectorGrid() {
    const { width } = this.scale
    const state = this.game.registry.get('gameState') as GameState

    const startY = state.safeArea.top + 260
    const unlockedGroups = this.paramGroups.filter(g => this.unlockedParams.has(g.key))
    const groupWidth = Math.max(140, (width - state.safeArea.left - state.safeArea.right - 48) / Math.max(unlockedGroups.length, 1))
    const startX = state.safeArea.left + groupWidth / 2

    // グリッドの下端 Y 座標を記録（プレビュー配置用）
    let gridBottomY = startY

    unlockedGroups.forEach((group, groupIndex) => {
      const x = startX + groupIndex * groupWidth
      const y = startY

      const groupContainer = this.add.container(x, y)
      ;(groupContainer as any).typeButtons = []
      ;(groupContainer as any).qtyButtons = []
      this.selectorGroups.set(group.key, groupContainer)

      const labelText = this.add.text(0, -40, group.label, {
        fontSize: '13px', color: '#8899aa', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
      }).setOrigin(0.5)
      groupContainer.add(labelText)

      // 種類ボタン（左列）
      group.options.forEach((option, optIndex) => {
        const isActive = (this.attempt as any)[group.key] === option
        const isLocked = !this.unlockedParams.has(group.key)
        const btn = this.createSelectorButton(
          -30, optIndex * 62,
          group.labels[option].short,
          group.labels[option].note,
          isActive, isLocked,
          () => this.onSelectorChange(group.key, option),
        )
        groupContainer.add(btn)
        ;(groupContainer as any).typeButtons[optIndex] = btn
      })

      // 量ボタン（右列）
      group.qtyOptions.forEach((qtyOption, optIndex) => {
        const isActive = (this.attempt as any)[`${group.key}Qty`] === qtyOption
        const isLocked = !this.unlockedParams.has(group.key)
        const btn = this.createSelectorButton(
          30, optIndex * 62,
          group.qtyLabels[qtyOption],
          '量',
          isActive, isLocked,
          () => this.onQuantityChange(group.key, qtyOption),
        )
        groupContainer.add(btn)
        ;(groupContainer as any).qtyButtons[optIndex] = btn
      })

      // グリッド下端更新（ラベル -40 + 最大ボタン下端）
      const groupBottom = y + 40 + Math.max(group.options.length, group.qtyOptions.length) * 62
      gridBottomY = Math.max(gridBottomY, groupBottom)

      this.add.existing(groupContainer)
    })

    // プレビューパネルの Y 位置を動的に設定（グリッド下端 + マージン）
    ;(this as any).selectorGridBottomY = gridBottomY
  }

  private createSelectorButton(
    x: number, y: number,
    label: string, note: string,
    isActive: boolean, isLocked: boolean,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const activeBg = 0x2d6a4f
    const inactiveBg = 0x3d4a5c
    const lockedBg = 0x1a1a2e

    const container = this.add.container(x, y)

    const bg = this.add.graphics()
    const bgColor = isLocked ? lockedBg : (isActive ? activeBg : inactiveBg)
    bg.fillStyle(bgColor, isLocked ? 0.5 : 1)
    bg.fillRoundedRect(-60, -28, 120, 56, 8)

    const labelText = this.add.text(0, -10, label, {
      fontSize: '12px', color: isLocked ? '#555555' : '#ffffff', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)

    const noteText = this.add.text(0, 14, isLocked ? '🔒' : note, {
      fontSize: '10px', color: isLocked ? '#555555' : '#a0b0c0', fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    container.add([bg, labelText, noteText])

    if (!isLocked) {
      const hitArea = new Phaser.Geom.Rectangle(-60, -28, 120, 56)
      container.setSize(120, 56)
      container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
        .on('pointerdown', () => { container.setAlpha(0.7); onClick() })
        .on('pointerup', () => container.setAlpha(1))
        .on('pointerout', () => container.setAlpha(1))
        .on('pointerover', () => {})
    }

    ;(container as any).setState = (active: boolean, locked: boolean) => {
      bg.clear()
      const newBgColor = locked ? 0x1a1a2e : (active ? 0x2d6a4f : 0x3d4a5c)
      bg.fillStyle(newBgColor, locked ? 0.5 : 1)
      bg.fillRoundedRect(-60, -28, 120, 56, 8)
      labelText.setColor(locked ? '#555555' : '#ffffff')
      noteText.setText(locked ? '🔒' : note)
      noteText.setColor(locked ? '#555555' : '#a0b0c0')
    }

    ;(container as any).originalNote = note
    return container
  }

  private onSelectorChange(key: string, value: string) {
    this.attempt = applyTypeChoice(this.attempt, key, value)
    this.refreshButtonStates(key)
    this.unlockNext(key)
    this.updatePreview()
  }

  private onQuantityChange(key: string, value: string) {
    this.attempt = applyQtyChoice(this.attempt, key, value)
    this.refreshButtonStates(key)
    this.updatePreview()
  }

  private refreshButtonStates(groupKey: string) {
    const groupContainer = this.selectorGroups.get(groupKey)
    if (!groupContainer) return

    const group = this.paramGroups.find(g => g.key === groupKey)
    if (!group) return

    group.options.forEach((option, optIndex) => {
      const isActive = (this.attempt as any)[groupKey] === option
      const isLocked = !this.unlockedParams.has(groupKey)
      const btn = (groupContainer as any).typeButtons?.[optIndex] as any
      if (btn?.setState) btn.setState(isActive, isLocked)
    })
    group.qtyOptions.forEach((qtyOption, optIndex) => {
      const isActive = (this.attempt as any)[`${groupKey}Qty`] === qtyOption
      const isLocked = !this.unlockedParams.has(groupKey)
      const btn = (groupContainer as any).qtyButtons?.[optIndex] as any
      if (btn?.setState) btn.setState(isActive, isLocked)
    })
  }

  private unlockNext(key: string) {
    const idx = PARAM_ORDER.indexOf(key)
    if (idx >= 0 && idx < PARAM_ORDER.length - 1) {
      const next = PARAM_ORDER[idx + 1]
      if (!this.unlockedParams.has(next)) {
        this.unlockedParams.add(next)
        this.rebuildSelectorGrid()
      }
    }
  }

  private rebuildSelectorGrid() {
    this.selectorGroups.forEach((group) => group.destroy())
    this.selectorGroups.clear()
    this.createSelectorGrid()
  }

  private createPreviewPanel() {
    const { width, height } = this.scale
    const state = this.game.registry.get('gameState') as GameState

    // グリッド下端 Y 座標を取得（createSelectorGrid で保存されている）
    const gridBottom = (this as any).selectorGridBottomY || state.safeArea.top + 260

    // プレビューはグリッド下端からマージン 20px あけて配置
    const panelY = Math.min(height - state.safeArea.bottom - 200, gridBottom + 40)

    this.previewContainer = this.add.container(width / 2, panelY)

    const bg = this.add.graphics()
    bg.fillStyle(0x0f0f1a, 0.95)
    bg.fillRoundedRect(-260, -90, 520, 180, 16)
    bg.lineStyle(2, 0x2d6a4f, 0.5)
    bg.strokeRoundedRect(-260, -90, 520, 180, 16)
    this.previewContainer.add(bg)

    const titleText = this.add.text(0, -72, '完成予定の調合液', {
      fontSize: '14px', color: '#8899aa', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.previewContainer.add(titleText)

    this.gradeText = this.add.text(0, -45, '', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.previewContainer.add(this.gradeText)

    this.matchScoreText = this.add.text(0, -15, '', {
      fontSize: '13px', color: '#8bcfef', fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)
    this.previewContainer.add(this.matchScoreText)

    const detailLabels = ['錆除去率: ', '金属侵食: ', '有害副産物: ']
    detailLabels.forEach((label, i) => {
      const text = this.add.text(-240, 12 + i * 24, label, {
        fontSize: '12px', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif', wordWrap: { width: 460 },
      })
      this.detailTexts.push(text)
      this.previewContainer.add(text)
    })

    const warningText = this.add.text(0, 84, '', {
      fontSize: '12px', color: '#f87171', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold', wordWrap: { width: 460 },
    }).setOrigin(0.5)
    this.detailTexts.push(warningText)
    this.previewContainer.add(warningText)
  }

  private updatePreview() {
    const preview = getPreviewText(this.attempt)

    this.gradeText.setText(preview.line1)
    this.gradeText.setColor('#ffffff')
    this.gradeText.setWordWrapWidth(460)

    this.matchScoreText.setText(preview.line2)
    this.matchScoreText.setColor('#8bcfef')
    this.matchScoreText.setWordWrapWidth(460)

    this.detailTexts[0].setText('錆除去率: —')
    this.detailTexts[1].setText('金属侵食: —')
    this.detailTexts[2].setText('有害副産物: —')
    this.detailTexts[3].setText('')
  }

  private createExecuteButton() {
    const { width, height } = this.scale
    const state = this.game.registry.get('gameState') as GameState

    const btnY = height - state.safeArea.bottom - 60

    this.executeButton = this.add.container(width / 2, btnY)

    const bg = this.add.graphics()
    bg.fillStyle(0x2d6a4f, 1)
    bg.fillRoundedRect(-100, -32, 200, 64, 16)
    this.executeButton.add(bg)

    const text = this.add.text(0, 0, '🗡️ 調合を実行する', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.executeButton.add(text)

    this.executeButton.setSize(200, 64)

    const hitArea = new Phaser.Geom.Rectangle(-100, -32, 200, 64)
    this.executeButton.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => {
        this.executeButton.setAlpha(0.7)
        this.executeTreatment()
      })
      .on('pointerup', () => this.executeButton.setAlpha(1))
      .on('pointerout', () => this.executeButton.setAlpha(1))
      .on('pointerover', () => {})
  }

  private executeTreatment() {
    if (this.isExecuted) return
    this.isExecuted = true

    const result = executeTreatment(this.attempt)

    // プレビュー更新を先に行う（シーン遷移前に結果を表示）
    this.showResultPreview(result)

    this.executeButton.setAlpha(0.5)
    this.executeButton.removeAllListeners()

    const state = this.game.registry.get('gameState') as GameState
    state.completeEpisode(result.fate.grade as any, result.fate.trustDelta, result.fate.reward)

    // delayedCall は RAF 依存のため、フレームカウントで遷移
    ;(this as any).resultTransitionDelay = 90 // ~1.5秒 @ 60fps
    this.game.registry.set('pendingTreatmentResult', result)
  }

  private showResultPreview(result: { recipeResult: any; reactionResult: any; fate: any }) {
    const { recipeResult, reactionResult, fate } = result
    const gradeColors: Record<string, number> = {
      PERFECT: 0x65e6ad, GOOD: 0x8bcfef, PARTIAL: 0xf6c94e, DAMAGED: 0xf87171, ACCIDENT: 0xf87171,
    }
    const grade = fate.grade || 'DAMAGED'

    // 防御的チェック: scene がアクティブな場合のみ更新
    const sys = (this as any).sys
    if (!sys || !sys.isActive()) {
      console.warn('LabSceneV2 not active, skipping preview update')
      return
    }

    try {
      if (this.gradeText && this.gradeText.active) {
        this.gradeText.setText(`${GRADE_EMOJIS[grade] || '💀'} ${grade}`)
        this.gradeText.setColor('#' + (gradeColors[grade] || 0xf87171).toString(16).padStart(6, '0'))
        this.gradeText.setWordWrapWidth(460)
      }
      if (this.matchScoreText && this.matchScoreText.active) {
        this.matchScoreText.setText(`${recipeResult.matchScore || 0} / 6 パラメータ一致`)
        this.matchScoreText.setWordWrapWidth(460)
      }
      if (this.detailTexts && this.detailTexts.length >= 4) {
        this.detailTexts.forEach(t => { if (t && t.active) t.setText('') })
        this.detailTexts[0].setText(`錆除去率: ${reactionResult.corrosionRemoved}%`)
        this.detailTexts[1].setText(`金属侵食: ${reactionResult.metalDamage > 0 ? reactionResult.metalDamage + '%' : 'なし'}`)
        this.detailTexts[2].setText(`有害副産物: ${reactionResult.byproductHazard ? '⚠️ あり' : '✅ なし'}`)
        if (recipeResult.isAccident) {
          this.detailTexts[3].setText('⚠️ 危険な組み合わせです — 事故が発生します')
        }
      }
    } catch (e) {
      console.error('showResultPreview error:', e)
    }
  }

  update() {
    // 結果表示後の遷移遅延（手動 step 対応）
    const delay = (this as any).resultTransitionDelay
    if (delay && delay > 0) {
      ;(this as any).resultTransitionDelay = delay - 1
      if (delay <= 1) {
        const result = this.game.registry.get('pendingTreatmentResult')
        this.scene.start('ResultScene', {
          outcome: result.fate,
          reaction: result.reactionResult,
          attempt: this.attempt,
        })
      }
    }
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    const state = this.game.registry.get('gameState') as GameState
    state.updateSafeArea(gameSize.width, gameSize.height)
  }

  shutdown() {
    this.scale.off('resize', this.onResize, this)
  }
}