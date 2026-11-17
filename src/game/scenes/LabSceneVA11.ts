import Phaser from 'phaser'
import {
  createEmptyAttempt,
  applyTypeChoice,
  executeTreatment,
  REQUEST_CARD,
  GRADE_EMOJIS,
  type RecipeAttempt,
  type TreatmentResult,
} from '../../lib/treatmentEngine'
import {
  ACID_LABELS,
  CONC_LABELS,
  TEMP_LABELS,
  PROC_LABELS,
  type AcidChoice,
} from '../../lib/recipeEngine'
import { GameState } from '../state/GameState'
import { formatNoteTitle, getNote } from '../../lib/knowledge'
import {
  PREDICTIONS,
  applyUnlockConstraints,
  buildAnalysisMemo,
  evaluatePrediction,
  executePractice,
  isParamUnlocked,
  toLearnedSet,
  visibleHints,
  type PredictionId,
} from '../../lib/learning'

/**
 * LabSceneVA11 — 処置ラボ調合画面
 *
 * 画面構成 (1280 × 720):
 * ┌─────────────────────────────────────────────────────────────┐
 * │ HUD（評判・所持金）                                          │
 * ├──────────────────┬──────────────────┬───────────────────────┤
 * │ 📋 依頼と分析ヒント │ 🧪 処置液        │ ⚗️ 調合パラメータ設定   │
 * │ ・ガルドの要望     │   リアクター     │ 1. 試薬 [塩酸/クエン/リン酸]│
 * │ ・目標処置液       │ ・フラスコ液体   │ 2. 濃度 [薄/標準/濃]   │
 * │ ・★ 4つのヒント   │ ・配合サマリー   │ 3. 温度 [低温/中温/高温]│
 * │ ・ガイド案内       │ ・予測反応ステータス│ 4. 手順 [短時間/標準]   │
 * │                  │                  │ 5. 反応 [短め/しっかり] │
 * │                  │                  │ 6. 濾過 [ざっと/丁寧に] │
 * ├──────────────────┴──────────────────┴───────────────────────┤
 * │ [🔄 リセット]       [👁️ 詳細プレビュー]   [🗡️ 修復処置を実行する]   │
 * └─────────────────────────────────────────────────────────────┘
 */

type ButtonRef = {
  container: Phaser.GameObjects.Container
  bg: Phaser.GameObjects.Graphics
  label: Phaser.GameObjects.Text
  note: Phaser.GameObjects.Text
  checkText: Phaser.GameObjects.Text
  groupKey: string
  optionKey: string
  w: number
  h: number
  activeColor: number
}

export class LabSceneVA11 extends Phaser.Scene {
  private attempt: RecipeAttempt = createEmptyAttempt()
  private state!: GameState
  private currentResult!: TreatmentResult
  private prediction: PredictionId | null = null
  private modalObjects: Phaser.GameObjects.GameObject[] = []

  // UI 参照: 中央リアクター
  private shakerContainer!: Phaser.GameObjects.Container
  private liquidGraphics!: Phaser.GameObjects.Graphics
  private bubbles: { x: number; y: number; r: number; speed: number; alpha: number }[] = []
  private volumeBar!: Phaser.GameObjects.Graphics
  private volumeText!: Phaser.GameObjects.Text
  private summaryText1!: Phaser.GameObjects.Text
  private summaryText2!: Phaser.GameObjects.Text
  private gradeBadgeText!: Phaser.GameObjects.Text
  private hazardWarningText!: Phaser.GameObjects.Text
  private metricTexts: Phaser.GameObjects.Text[] = []

  // UI 参照: パラメータボタン群
  private paramButtons: Map<string, ButtonRef> = new Map()

  // アニメーション状態
  private isExecuting = false
  private bubbleTimer?: Phaser.Time.TimerEvent

  constructor() {
    super({ key: 'LabSceneVA11' })
  }

  init(data: { gameState: GameState }) {
    this.state = data.gameState || (this.game.registry.get('gameState') as GameState)
  }

  create() {
    const { width, height } = this.scale

    // 背景描画
    this.drawBackground()

    // 学習初期化（試作）: 観察パートで得たノートを付与し、未解放パラメータを固定する
    for (const id of ['rust', 'chloride-rust', 'acid-strength']) this.state?.learn(id)
    this.computeResult()

    // セーフエリア基準値
    const safeL = this.state?.safeArea?.left ?? 0
    const safeR = this.state?.safeArea?.right ?? 0
    const safeB = this.state?.safeArea?.bottom ?? 0
    const topY = 62 + (this.state?.safeArea?.top ?? 0)
    const actionBarY = height - safeB - 56
    const contentH = Math.max(0, actionBarY - topY - 12)

    // 3カラムの配置
    const col1X = safeL + 16
    const col1W = 360

    const col2X = safeL + 390
    const col2W = 330

    const col3X = safeL + 734
    const col3W = Math.max(480, width - safeR - col3X - 16)

    // 1. 左カラム: 依頼と分析ヒント
    this.createRequestAndHintsPanel(col1X, topY, col1W, contentH)

    // 2. 中央カラム: 処置液リアクター & ステータス
    this.createReactorPanel(col2X, topY, col2W, contentH)

    // 3. 右カラム: パラメータ操作盤
    this.createParamControlPanel(col3X, topY, col3W, contentH)

    // 4. 下部アクションバー
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
  // 左カラム: 依頼と分析ヒント
  // ────────────────────────────────────────
  private createRequestAndHintsPanel(x: number, y: number, w: number, h: number) {
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

    const headerTitle = this.add.text(16, 12, '📋 依頼書 ＆ 観察記録', {
      fontSize: '18px',
      color: '#65e6ad',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })
    container.add(headerTitle)

    // 顧客情報
    const customer = this.add.text(16, 52, '🧔 ガルド（鍛冶師）', {
      fontSize: '16px',
      color: '#ffd700',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })
    container.add(customer)

    // セリフ枠
    const quoteBg = this.add.graphics()
    quoteBg.fillStyle(0x172033, 0.9)
    quoteBg.fillRoundedRect(16, 76, w - 32, 54, 8)
    quoteBg.lineStyle(1, 0x2d3a54, 0.6)
    quoteBg.strokeRoundedRect(16, 76, w - 32, 54, 8)
    container.add(quoteBg)

    const quoteText = this.add.text(26, 82, '「親父の形見の剣だ。港町の塩害で錆びきってる……なんとかならんか？」', {
      fontSize: '13px',
      color: '#cbd5e1',
      fontFamily: 'system-ui, sans-serif',
      wordWrap: { width: w - 52, useAdvancedWrap: true },
      lineSpacing: 4,
    })
    container.add(quoteText)

    // 処置ターゲット
    const targetLabel = this.add.text(16, 138, '修復対象：' + REQUEST_CARD.name, {
      fontSize: '15px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })
    container.add(targetLabel)

    const targetDesc = this.add.text(16, 160, '目標組成: ' + REQUEST_CARD.compound, {
      fontSize: '12px',
      color: '#8bcfef',
      fontFamily: 'system-ui, sans-serif',
      wordWrap: { width: w - 32 },
    })
    container.add(targetDesc)

    // 区切り線
    const sep = this.add.graphics()
    sep.lineStyle(1, 0x243048, 0.8)
    sep.beginPath()
    sep.moveTo(16, 182)
    sep.lineTo(w - 16, 182)
    sep.strokePath()
    container.add(sep)

    // ヒント見出し
    const hintHeading = this.add.text(16, 192, '🔍 調合の重要ヒント（必ず確認）', {
      fontSize: '15px',
      color: '#facc15',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })
    container.add(hintHeading)

    // ヒント4カード
    const hints = visibleHints(REQUEST_CARD.hints, this.learnedSet())
    const hintColors = [0x1e293b, 0x2c1b22, 0x2d2218, 0x192738]
    const borderColors = [0x38bdf8, 0xf87171, 0xfb923c, 0x4ade80]
    const textColors = ['#e2e8f0', '#fca5a5', '#fed7aa', '#bbf7d0']

    let hintY = 220
    hints.forEach((hintText, idx) => {
      const cardH = 54
      const hCard = this.add.graphics()
      hCard.fillStyle(hintColors[idx % hintColors.length], 0.9)
      hCard.fillRoundedRect(16, hintY, w - 32, cardH, 8)
      hCard.lineStyle(1.5, borderColors[idx % borderColors.length], 0.7)
      hCard.strokeRoundedRect(16, hintY, w - 32, cardH, 8)
      container.add(hCard)

      const hText = this.add.text(26, hintY + 8, hintText, {
        fontSize: '13px',
        color: textColors[idx % textColors.length],
        fontFamily: 'system-ui, sans-serif',
        fontStyle: 'bold',
        wordWrap: { width: w - 52 },
        lineSpacing: 3,
      })
      container.add(hText)

      hintY += cardH + 4
    })

    // 操作ガイドメッセージ
    const guideBg = this.add.graphics()
    guideBg.fillStyle(0x13271f, 0.9)
    guideBg.fillRoundedRect(16, h - 40, w - 32, 36, 8)
    guideBg.lineStyle(1, 0x22c55e, 0.5)
    guideBg.strokeRoundedRect(16, h - 40, w - 32, 36, 8)
    container.add(guideBg)

    const guideText = this.add.text(26, h - 35, '💡 右の操作盤で6つの条件を選択してください。', {
      fontSize: '11px',
      color: '#86efac',
      fontFamily: 'system-ui, sans-serif',
      wordWrap: { width: w - 52, useAdvancedWrap: true },
      lineSpacing: 2,
    })
    container.add(guideText)
  }

  // ────────────────────────────────────────
  // 中央カラム: 処置液リアクター & ステータス
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

    const title = this.add.text(w / 2, 22, '🧪 処置液リアクター', {
      fontSize: '17px',
      color: '#8bcfef',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    container.add(title)

    // フラスコ / シェイカー
    const shakerW = 126
    const shakerH = 200
    const centerX = w / 2 - 14
    const centerY = 168

    this.shakerContainer = this.add.container(centerX, centerY)
    container.add(this.shakerContainer)

    // フラスコ外枠
    const glass = this.add.graphics()
    glass.fillStyle(0xffffff, 0.04)
    glass.fillRoundedRect(-shakerW / 2, -shakerH / 2, shakerW, shakerH, 16)
    glass.lineStyle(2.5, 0x94a3b8, 0.4)
    glass.strokeRoundedRect(-shakerW / 2, -shakerH / 2, shakerW, shakerH, 16)

    // ガラスハイライト反射光
    glass.lineStyle(2, 0xffffff, 0.25)
    glass.beginPath()
    glass.moveTo(-shakerW / 2 + 10, -shakerH / 2 + 20)
    glass.lineTo(-shakerW / 2 + 10, shakerH / 2 - 20)
    glass.strokePath()

    // 栓（ストッパー）
    glass.fillStyle(0x334155, 1)
    glass.fillRoundedRect(-24, -shakerH / 2 - 12, 48, 14, 6)
    glass.lineStyle(1.5, 0x64748b, 0.8)
    glass.strokeRoundedRect(-24, -shakerH / 2 - 12, 48, 14, 6)
    this.shakerContainer.add(glass)

    // 液体グラフィックス
    this.liquidGraphics = this.add.graphics()
    this.shakerContainer.add(this.liquidGraphics)

    // 液量ゲージ
    const gaugeX = centerX + shakerW / 2 + 16
    const gaugeY = centerY - shakerH / 2
    const gaugeBg = this.add.graphics()
    gaugeBg.fillStyle(0x1e293b, 1)
    gaugeBg.fillRoundedRect(gaugeX, gaugeY, 8, shakerH, 4)
    gaugeBg.lineStyle(1, 0x334155, 0.7)
    gaugeBg.strokeRoundedRect(gaugeX, gaugeY, 8, shakerH, 4)
    container.add(gaugeBg)

    this.volumeBar = this.add.graphics()
    container.add(this.volumeBar)

    this.volumeText = this.add.text(gaugeX + 16, centerY, '180 ml', {
      fontSize: '13px',
      color: '#93c5fd',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5)
    container.add(this.volumeText)

    // 配合サマリー枠
    const summaryBg = this.add.graphics()
    summaryBg.fillStyle(0x131d2e, 0.9)
    summaryBg.fillRoundedRect(16, 274, w - 32, 58, 8)
    summaryBg.lineStyle(1, 0x23334d, 0.8)
    summaryBg.strokeRoundedRect(16, 274, w - 32, 58, 8)
    container.add(summaryBg)

    this.summaryText1 = this.add.text(w / 2, 286, '', {
      fontSize: '13px',
      color: '#67e8f9',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    container.add(this.summaryText1)

    this.summaryText2 = this.add.text(w / 2, 310, '', {
      fontSize: '13px',
      color: '#94a3b8',
      fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)
    container.add(this.summaryText2)

    // リアルタイム反応予測カード
    const statusTop = 340
    const statusBottom = h - 12
    const statusCard = this.add.graphics()
    statusCard.fillStyle(0x111c2e, 0.95)
    statusCard.fillRoundedRect(16, statusTop, w - 32, statusBottom - statusTop, 10)
    statusCard.lineStyle(1.5, 0x243550, 0.8)
    statusCard.strokeRoundedRect(16, statusTop, w - 32, statusBottom - statusTop, 10)
    container.add(statusCard)

    const statusTitle = this.add.text(w / 2, 355, '📊 リアルタイム反応予測', {
      fontSize: '14px',
      color: '#94a3b8',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    container.add(statusTitle)

    // 等級バッジ
    this.gradeBadgeText = this.add.text(w / 2, 380, '', {
      fontSize: '14px',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      wordWrap: { width: w - 48, useAdvancedWrap: true },
      align: 'center',
    }).setOrigin(0.5)
    container.add(this.gradeBadgeText)

    // 危険アラートテキスト
    this.hazardWarningText = this.add.text(w / 2, 408, '', {
      fontSize: '12px',
      color: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
      wordWrap: { width: w - 48, useAdvancedWrap: true },
      align: 'center',
    }).setOrigin(0.5)
    container.add(this.hazardWarningText)

    // 詳細指標3行
    const metricLabels = ['錆除去率', '金属侵食', '副産物毒性']
    this.metricTexts = []
    metricLabels.forEach((label, i) => {
      const my = 430 + i * 18
      const lText = this.add.text(32, my, label, {
        fontSize: '13px',
        color: '#94a3b8',
        fontFamily: 'system-ui, sans-serif',
      })
      container.add(lText)

      const vText = this.add.text(w - 32, my, '', {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(1, 0)
      container.add(vText)
      this.metricTexts.push(vText)
    })
  }

  // ────────────────────────────────────────
  // 右カラム: パラメータ操作盤
  // ────────────────────────────────────────
  private createParamControlPanel(x: number, y: number, w: number, h: number) {
    const container = this.add.container(x, y)

    // パネル枠
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

    const title = this.add.text(16, 12, '⚗️ 調合パラメータ設定', {
      fontSize: '18px',
      color: '#65e6ad',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })
    container.add(title)

    const sub = this.add.text(w - 16, 15, '各項目を選択して調整', {
      fontSize: '12px',
      color: '#94a3b8',
      fontFamily: 'system-ui, sans-serif',
    }).setOrigin(1, 0)
    container.add(sub)

    // 6つのパラメータグループの定義
    const groups = [
      {
        key: 'acid',
        title: '1. 試薬の選択 (Acid)',
        titleColor: '#ffd700',
        options: [
          { key: 'HCl', label: '🧪 塩酸 (HCl)', note: '強力・速効', color: 0xef4444 },
          { key: 'Citric', label: '🍋 クエン酸', note: '穏やか・安全', color: 0xeab308 },
          { key: 'Phosphoric', label: '🧬 リン酸', note: '塩化物錆に有効', color: 0x22c55e },
        ],
      },
      {
        key: 'concentration',
        title: '2. 試薬濃度 (Concentration)',
        titleColor: '#38bdf8',
        options: [
          { key: 'light', label: '薄め (Light)', note: '安全・効果弱', color: 0x38bdf8 },
          { key: 'standard', label: '標準 (Standard)', note: 'バランス良', color: 0x3b82f6 },
          { key: 'strong', label: '濃め (Strong)', note: '高効果・侵食恐れ', color: 0x6366f1 },
        ],
      },
      {
        key: 'temperature',
        title: '3. 反応温度 (Temperature)',
        titleColor: '#fb923c',
        options: [
          { key: 'cold', label: '低温 (Cold)', note: '反応穏やか', color: 0x38bdf8 },
          { key: 'warm', label: '中温 (Warm)', note: '適温・安定', color: 0xf59e0b },
          { key: 'hot', label: '高温 (Hot)', note: '高速・ダメージ', color: 0xef4444 },
        ],
      },
      {
        key: 'procedure',
        title: '4. 洗浄手順 (Procedure)',
        titleColor: '#c084fc',
        options: [
          { key: 'quick', label: '短時間処置 (Quick)', note: '表面錆のみ除去', color: 0xa855f7 },
          { key: 'standard', label: '標準処置 (Standard)', note: '深部までじっくり', color: 0x8b5cf6 },
        ],
      },
      {
        key: 'reaction',
        title: '5. 反応浸透時間 (Reaction Time)',
        titleColor: '#2dd4bf',
        options: [
          { key: 'quick', label: '短め (Quick)', note: '浅い浸透時間', color: 0x14b8a6 },
          { key: 'standard', label: 'しっかり (Standard)', note: '深部まで浸透', color: 0x0d9488 },
        ],
      },
      {
        key: 'filtration',
        title: '6. 仕上げ濾過 (Filtration)',
        titleColor: '#f1f5f9',
        options: [
          { key: 'quick', label: 'ざっと (Quick)', note: '粗めの不純物濾過', color: 0x64748b },
          { key: 'standard', label: '丁寧に (Standard)', note: '微細濾過で純化', color: 0x475569 },
        ],
      },
    ]

    let curY = 56
    const totalW = w - 32

    groups.forEach((group) => {
      // グループ見出し
      const gTitle = this.add.text(16, curY, group.title, {
        fontSize: '14px',
        color: group.titleColor,
        fontFamily: 'system-ui, sans-serif',
        fontStyle: 'bold',
      })
      container.add(gTitle)
      curY += 18

      // ボタンの並び
      const optCount = group.options.length
      const gap = 10
      const btnW = Math.floor((totalW - (optCount - 1) * gap) / optCount)
      const btnH = 48

      group.options.forEach((opt, idx) => {
        const bx = 16 + idx * (btnW + gap)
        const btnRef = this.createSelectorButton(bx, curY, btnW, btnH, group.key, opt.key, opt.label, opt.note, opt.color)
        container.add(btnRef.container)
        this.paramButtons.set(`${group.key}_${opt.key}`, btnRef)
      })

      curY += btnH + 4
    })
  }

  // セレクターボタンの作成
  private createSelectorButton(
    x: number,
    y: number,
    w: number,
    h: number,
    groupKey: string,
    optionKey: string,
    labelStr: string,
    noteStr: string,
    activeColor: number
  ): ButtonRef {
    const btnContainer = this.add.container(x, y)
    const bg = this.add.graphics()
    btnContainer.add(bg)

    // ラベル
    const label = this.add.text(10, 8, labelStr, {
      fontSize: '13px',
      color: '#cbd5e1',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })
    btnContainer.add(label)

    // サブノート
    const note = this.add.text(10, 26, noteStr, {
      fontSize: '11px',
      color: '#94a3b8',
      fontFamily: 'system-ui, sans-serif',
    })
    btnContainer.add(note)

    // チェックマーク「✓」
    const checkText = this.add.text(w - 12, 10, '✓', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0).setVisible(false)
    btnContainer.add(checkText)

    btnContainer.setSize(w, h)
    // Phaser の Container は displayOrigin が (w/2, h/2) になるため、
    // hitArea をその分ずらさないと当たり判定が見た目より左上にずれる
    const hitRect = new Phaser.Geom.Rectangle(w / 2, h / 2, w, h)
    btnContainer.setInteractive(hitRect, Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => {
        if (this.isExecuting) return
        btnContainer.setScale(0.96)
        this.selectParam(groupKey, optionKey)
      })
      .on('pointerup', () => btnContainer.setScale(1))
      .on('pointerout', () => btnContainer.setScale(1))

    return {
      container: btnContainer,
      bg,
      label,
      note,
      checkText,
      groupKey,
      optionKey,
      w,
      h,
      activeColor,
    }
  }

  // ────────────────────────────────────────
  // 下部アクションバー
  // ────────────────────────────────────────
  private createBottomActionBar(width: number, height: number) {
    const safeB = this.state?.safeArea?.bottom ?? 0
    const barY = height - safeB - 56

    // [🔄 リセット]
    this.createActionButton(16, barY, 150, 50, '🔄 リセット', '#641b1b', () => this.resetTreatment())

    // [👁️ 詳細プレビュー]
    this.createActionButton(180, barY, 170, 50, '👁️ 詳細プレビュー', '#1e3a5f', () => this.showFullPreview())

    // [🧪 端材で練習]（学習ループ試作: 失敗しても安全な練習処置）
    this.createActionButton(364, barY, 180, 50, '🧪 端材で練習', '#7c2d12', () => this.runPractice())

    // [🗡️ 処置液で修復を実行する] (大型・目立つ)
    const execW = Math.min(706, width - 558 - 16)
    this.createActionButton(558, barY, execW, 50, '🗡️ 処置液で修復を実行する', '#059669', () => this.executeTreatment())
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
    // 同上: Container の displayOrigin 分だけ hitArea をずらして見た目と一致させる
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
  }

  // ────────────────────────────────────────
  // 学習進行ヘルパー
  // ────────────────────────────────────────
  private learnedSet() {
    return toLearnedSet(this.state?.learnedNotes ?? [])
  }

  private computeResult() {
    this.attempt = applyUnlockConstraints(this.attempt, this.learnedSet())
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
  // パラメータ選択ロジック
  // ────────────────────────────────────────
  private selectParam(groupKey: string, optionKey: string) {
    if (!isParamUnlocked(groupKey, this.learnedSet())) {
      this.showToast('🔒 まだ扱えない（知識ノート未獲得）\n端材で練習すると扱えるようになる', '#facc15')
      return
    }
    this.attempt = applyTypeChoice(this.attempt, groupKey, optionKey)
    this.computeResult()

    // 軽くシェイカー揺れ
    this.tweens.add({
      targets: this.shakerContainer,
      x: { from: this.shakerContainer.x, to: this.shakerContainer.x + 4 },
      duration: 60,
      yoyo: true,
      repeat: 1,
    })

    this.refreshAll()
  }

  // ────────────────────────────────────────
  // UIの全体再描画
  // ────────────────────────────────────────
  private refreshAll() {
    this.updateButtons()
    this.updateReactor()
    this.updateStatus()
  }

  private updateButtons() {
    this.paramButtons.forEach((btnRef) => {
      const isSelected = (this.attempt as Record<string, string>)[btnRef.groupKey] === btnRef.optionKey

      btnRef.bg.clear()
      if (isSelected) {
        // 選択中ハイライト
        btnRef.bg.fillStyle(btnRef.activeColor, 0.95)
        btnRef.bg.fillRoundedRect(0, 0, btnRef.w, btnRef.h, 8)
        btnRef.bg.lineStyle(2, 0xffffff, 0.9)
        btnRef.bg.strokeRoundedRect(0, 0, btnRef.w, btnRef.h, 8)

        btnRef.label.setColor('#ffffff')
        btnRef.note.setColor('#f1f5f9')
        btnRef.checkText.setVisible(true)
      } else {
        // 未選択
        btnRef.bg.fillStyle(0x1e293b, 0.6)
        btnRef.bg.fillRoundedRect(0, 0, btnRef.w, btnRef.h, 8)
        btnRef.bg.lineStyle(1, 0x334155, 0.5)
        btnRef.bg.strokeRoundedRect(0, 0, btnRef.w, btnRef.h, 8)

        btnRef.label.setColor('#94a3b8')
        btnRef.note.setColor('#64748b')
        btnRef.checkText.setVisible(false)
      }
    })
  }

  private updateReactor() {
    const shakerW = 118
    const shakerH = 190

    // 試薬に応じた色決定
    const acidColors: Record<AcidChoice, number> = {
      HCl: 0xef4444,
      Citric: 0xeab308,
      Phosphoric: 0x22c55e,
    }
    const baseColor = acidColors[this.attempt.acid] || 0x22c55e

    // 液量比率
    const fillRatio = 0.65
    const liquidH = shakerH * fillRatio
    const liquidY = shakerH / 2 - liquidH

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
        -shakerW / 2 + 3,
        ly,
        shakerW - 6,
        lh + (i === layers - 1 ? 2 : 0),
        i === layers - 1 ? 12 : 0
      )
    }

    // 液面ハイライト
    this.liquidGraphics.fillStyle(0xffffff, 0.25)
    this.liquidGraphics.fillRect(-shakerW / 2 + 6, liquidY + 2, shakerW - 12, 4)

    // 泡パーティクル
    this.liquidGraphics.fillStyle(0xffffff, 0.4)
    this.bubbles.forEach((bub) => {
      this.liquidGraphics.fillCircle(bub.x, bub.y, bub.r)
    })

    // ゲージ更新
    this.volumeBar.clear()
    this.volumeBar.fillStyle(baseColor, 0.9)
    const gaugeX = this.shakerContainer.x + shakerW / 2 + 20
    const gaugeY = this.shakerContainer.y - shakerH / 2
    this.volumeBar.fillRoundedRect(gaugeX + 1, gaugeY + shakerH * (1 - fillRatio), 6, shakerH * fillRatio, 3)
    this.volumeText.setText('200 ml')

    // 配合サマリー更新
    const acidStr = ACID_LABELS[this.attempt.acid].short
    const concStr = CONC_LABELS[this.attempt.concentration].short
    const tempStr = TEMP_LABELS[this.attempt.temperature].short
    const procStr = PROC_LABELS[this.attempt.procedure].short
    const reacStr = this.attempt.reaction === 'standard' ? '浸透:しっかり' : '浸透:短め'
    const filtStr = this.attempt.filtration === 'standard' ? '濾過:丁寧' : '濾過:ざっと'

    this.summaryText1.setText(`【${acidStr}】 濃度: ${concStr} | 温度: ${tempStr}`)
    this.summaryText2.setText(`手順: ${procStr} | ${reacStr} | ${filtStr}`)
  }

  private updateBubbles() {
    const shakerW = 100
    const shakerH = 190
    const liquidY = shakerH / 2 - shakerH * 0.65

    // 新しい泡
    if (this.bubbles.length < 8 && Math.random() < 0.4) {
      this.bubbles.push({
        x: Phaser.Math.Between(-shakerW / 2 + 10, shakerW / 2 - 10),
        y: shakerH / 2 - 8,
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
      this.updateReactor()
    }
  }

  private updateStatus() {
    const fate = this.currentResult.fate
    const recipeRes = this.currentResult.recipeResult
    const reactRes = this.currentResult.reactionResult

    const grade = fate.grade
    const emoji = GRADE_EMOJIS[grade] || '⚠️'

    const gradeColors: Record<string, string> = {
      PERFECT: '#4ade80',
      GOOD: '#38bdf8',
      PARTIAL: '#facc15',
      DAMAGED: '#f87171',
      ACCIDENT: '#ef4444',
    }
    const color = gradeColors[grade] || '#ffffff'

    if (recipeRes.isAccident) {
      this.gradeBadgeText.setText(`💥 危険事故発生 (ACCIDENT)`)
      this.gradeBadgeText.setColor('#ef4444')
      this.hazardWarningText.setText('⚠️ 高温・高濃度HClで有毒塩素ガスが発生！')
    } else {
      this.gradeBadgeText.setText(`${emoji} 等級予測: ${grade} (${recipeRes.matchScore}/6 一致)`)
      this.gradeBadgeText.setColor(color)
      this.hazardWarningText.setText(reactRes.byproductHazard ? '⚠️ 副産物毒性のリスクあり' : '✅ 安全・副産物なし')
      this.hazardWarningText.setColor(reactRes.byproductHazard ? '#f87171' : '#4ade80')
    }

    // 指標テキスト
    this.metricTexts[0]?.setText(`${reactRes.corrosionRemoved}%`)
    this.metricTexts[0]?.setColor(reactRes.corrosionRemoved >= 80 ? '#4ade80' : reactRes.corrosionRemoved >= 50 ? '#facc15' : '#f87171')

    this.metricTexts[1]?.setText(reactRes.metalDamage > 0 ? `${reactRes.metalDamage}% (侵食あり)` : '0% (なし)')
    this.metricTexts[1]?.setColor(reactRes.metalDamage === 0 ? '#4ade80' : '#f87171')

    this.metricTexts[2]?.setText(reactRes.byproductHazard ? '⚠️ 毒性あり' : '✅ 正常')
    this.metricTexts[2]?.setColor(reactRes.byproductHazard ? '#f87171' : '#4ade80')
  }

  // ────────────────────────────────────────
  // 練習処置（端材テストピース: 結果は数値のみ、本番の評判・所持金に影響しない）
  // ────────────────────────────────────────
  private runPractice() {
    if (this.isExecuting) return
    const practice = executePractice(this.attempt, this.learnedSet(), this.state?.practiceCount ?? 0)
    if (this.state) {
      this.state.practiceCount++
      for (const id of practice.newlyLearned) this.state.learn(id)
    }
    this.attempt = practice.attempt
    this.currentResult = practice.result
    this.refreshAll()

    const r = practice.result.reactionResult
    const lines = [
      `🧪 練習処置（端材）: 錆除去 ${r.corrosionRemoved}% / 金属侵食 ${r.metalDamage}%`,
    ]
    if (r.byproductHazard) lines.push('⚠️ 危ない泡立ちがあった。本番では事故になる組み合わせだ')
    for (const id of practice.newlyLearned) {
      const note = getNote(id)
      if (note) lines.push(`📖 知識ノート獲得: ${formatNoteTitle(note, true)}`)
    }
    this.showToast(lines.join('\n'), practice.newlyLearned.length > 0 ? '#4ade80' : '#e0e0e0')
  }

  // ────────────────────────────────────────
  // 実行処理
  // ────────────────────────────────────────
  private executeTreatment() {
    if (this.isExecuting) return
    if (this.prediction === null) {
      this.showPredictionModal()
      return
    }
    this.isExecuting = true

    const result = this.currentResult
    const verdict = evaluatePrediction(this.prediction, result)
    const analysisMemo = buildAnalysisMemo(this.attempt, result, this.learnedSet())

    // 激しいシェイク & スワール演出
    this.tweens.add({
      targets: this.shakerContainer,
      x: { from: this.shakerContainer.x - 15, to: this.shakerContainer.x + 15 },
      angle: { from: -8, to: 8 },
      duration: 80,
      yoyo: true,
      repeat: 6,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.shakerContainer.angle = 0
        this.isExecuting = false

        // 結果を GameState に反映する（評判・所持金・完了フラグ）
        // ※ VA11 フローでは従来この呼び出しがなく、結果が表示だけで終わっていた
        this.state?.completeEpisode(result.fate.grade, result.fate.trustDelta, result.fate.reward)

        // 結果シーンへ遷移
        this.scene.start('ResultScene', {
          outcome: result.fate,
          reaction: result.reactionResult,
          attempt: this.attempt,
          predictionComment: verdict.comment,
          analysisMemo,
        })
      },
    })
  }

  // ────────────────────────────────────────
  // リセット処理
  // ────────────────────────────────────────
  private resetTreatment() {
    if (this.isExecuting) return
    this.attempt = createEmptyAttempt()
    this.prediction = null
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
  // 予想モーダル（実行前に結果を予想させる）
  // ────────────────────────────────────────
  private closeModal() {
    for (const obj of this.modalObjects) obj.destroy()
    this.modalObjects = []
  }

  private showPredictionModal() {
    const { width, height } = this.scale
    this.closeModal()

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.75)
      .setOrigin(0).setDepth(300).setInteractive()
    this.modalObjects.push(overlay)

    const title = this.add.text(width / 2, height / 2 - 170, '実行の前に — どうなると思う？', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(301)
    this.modalObjects.push(title)

    PREDICTIONS.forEach((p, i) => {
      const y = height / 2 - 110 + i * 72
      const container = this.add.container(width / 2, y).setDepth(301)
      const bg = this.add.graphics()
      bg.fillStyle(0x1e3a5f, 0.95)
      bg.fillRoundedRect(-280, -26, 560, 52, 10)
      bg.lineStyle(1.5, 0x8bcfef, 0.6)
      bg.strokeRoundedRect(-280, -26, 560, 52, 10)
      const label = this.add.text(0, 0, p.label, {
        fontSize: '17px',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
      }).setOrigin(0.5)
      container.add([bg, label])
      container.setSize(560, 52)
      const hit = new Phaser.Geom.Rectangle(0, 0, 560, 52)
      container.setInteractive(hit, Phaser.Geom.Rectangle.Contains)
        .on('pointerdown', () => {
          this.prediction = p.id
          this.closeModal()
          this.executeTreatment()
        })
      this.modalObjects.push(container)
    })
  }

  // ────────────────────────────────────────
  // 詳細プレビューモーダル
  // ────────────────────────────────────────
  private showFullPreview() {
    const { width, height } = this.scale
    const result = this.currentResult
    const fate = result.fate
    const react = result.reactionResult
    const recipeRes = result.recipeResult

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.75).setOrigin(0).setDepth(300).setInteractive()

    const modal = this.add.container(width / 2, height / 2).setDepth(301)
    const mw = 600
    const mh = 500

    const bg = this.add.graphics()
    bg.fillStyle(0x0f172a, 0.98)
    bg.fillRoundedRect(-mw / 2, -mh / 2, mw, mh, 16)
    bg.lineStyle(2, 0x38bdf8, 0.8)
    bg.strokeRoundedRect(-mw / 2, -mh / 2, mw, mh, 16)
    modal.add(bg)

    const grade = fate.grade
    const emoji = GRADE_EMOJIS[grade] || '⚠️'

    // モーダルタイトル
    modal.add(
      this.add.text(0, -mh / 2 + 35, `${emoji} 予測結果判定: ${grade}`, {
        fontSize: '24px',
        color: '#65e6ad',
        fontFamily: 'system-ui, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5)
    )

    modal.add(
      this.add.text(0, -mh / 2 + 75, `一致したパラメータ: ${recipeRes.matchScore} / 6`, {
        fontSize: '16px',
        color: '#93c5fd',
        fontFamily: 'system-ui, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5)
    )

    // 反応メトリクス
    const details = [
      `・錆除去率: ${react.corrosionRemoved}%`,
      `・金属侵食: ${react.metalDamage > 0 ? react.metalDamage + '%' : '0% (なし)'}`,
      `・有害副産物: ${react.byproductHazard ? '⚠️ 発生の危険あり' : '✅ 発生なし'}`,
      `・修復スコア: ${react.restorationScore} 点`,
    ]
    details.forEach((d, i) => {
      modal.add(
        this.add.text(-220, -mh / 2 + 115 + i * 28, d, {
          fontSize: '15px',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
        })
      )
    })

    // 物語テキスト
    const storyBox = this.add.graphics()
    storyBox.fillStyle(0x1e293b, 0.9)
    storyBox.fillRoundedRect(-240, 20, 480, 140, 8)
    modal.add(storyBox)

    modal.add(
      this.add.text(0, 90, fate.resultText.replace(/\\n/g, '\n'), {
        fontSize: '14px',
        color: '#cbd5e1',
        fontFamily: 'system-ui, sans-serif',
        align: 'center',
        wordWrap: { width: 450 },
        lineSpacing: 6,
      }).setOrigin(0.5)
    )

    // 閉じるボタン
    const closeBtnBg = this.add.graphics()
    closeBtnBg.fillStyle(0x334155, 1)
    closeBtnBg.fillRoundedRect(-80, mh / 2 - 55, 160, 42, 8)
    modal.add(closeBtnBg)

    const closeBtnText = this.add.text(0, mh / 2 - 34, '✕ 閉じる', {
      fontSize: '15px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    modal.add(closeBtnText)

    const closeContainer = this.add.zone(0, mh / 2 - 34, 160, 42).setInteractive()
    modal.add(closeContainer)

    const closeModal = () => {
      overlay.destroy()
      modal.destroy()
    }
    overlay.on('pointerdown', closeModal)
    closeContainer.on('pointerdown', closeModal)
  }

  // ────────────────────────────────────────
  // ショートカット
  // ────────────────────────────────────────
  private setupKeyboardShortcuts() {
    // 1〜3: 試薬
    this.input.keyboard?.on('keydown-ONE', () => this.selectParam('acid', 'HCl'))
    this.input.keyboard?.on('keydown-TWO', () => this.selectParam('acid', 'Citric'))
    this.input.keyboard?.on('keydown-THREE', () => this.selectParam('acid', 'Phosphoric'))
    // 実行・リセット・プレビュー
    this.input.keyboard?.on('keydown-ENTER', () => this.executeTreatment())
    this.input.keyboard?.on('keydown-E', () => this.executeTreatment())
    this.input.keyboard?.on('keydown-R', () => this.resetTreatment())
    this.input.keyboard?.on('keydown-P', () => this.showFullPreview())
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
