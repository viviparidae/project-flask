import Phaser from 'phaser'
import {
  dialogueNodes,
  initialDialogueState,
  type DialogueState,
  getPostDeliveryNodes,
  getInitialPostDeliveryNodeId,
} from '../../lib/dialogueEngine'

/**
 * DialogueScene — 対話フェーズ
 * 線形ノベル形式：テキスト表示 → タップで次へ
 * Phase 1 追加: 納品後の依頼人反応会話（postDelivery フラグで分岐）
 */
export class DialogueScene extends Phaser.Scene {
  private dialogueState: DialogueState = { ...initialDialogueState }
  private nextButton!: Phaser.GameObjects.Container
  private bgGraphics!: Phaser.GameObjects.Graphics
  private speakerNameText!: Phaser.GameObjects.Text
  private messageText!: Phaser.GameObjects.Text
  private moodEmojiText!: Phaser.GameObjects.Text
  private sceneBgText!: Phaser.GameObjects.Text

  // 納品後会話用
  private postDelivery = false
  private postDeliveryNodes: Record<string, any> = {}
  private outcomeGrade = ''

  constructor() {
    super({ key: 'DialogueScene' })
  }

  create() {
    const { width, height } = this.scale
    const state = this.game.registry.get('gameState')

    // init データから納品後フラグを取得
    const initData = this.scene.settings.data as {
      postDelivery?: boolean
      outcomeGrade?: string
      recipeResult?: any
    } | undefined
    this.postDelivery = initData?.postDelivery ?? false
    this.outcomeGrade = initData?.outcomeGrade ?? ''

    if (this.postDelivery) {
      this.postDeliveryNodes = getPostDeliveryNodes(this.outcomeGrade)
      this.dialogueState.nodeId = getInitialPostDeliveryNodeId(this.outcomeGrade)
    } else {
      this.dialogueState = { ...initialDialogueState }
    }

    // 背景
    this.bgGraphics = this.add.graphics()
    this.drawBackground()

    // シーン背景テキスト
    const bgText = this.postDelivery ? '荒野の仮設テント — 納品の瞬間' : '荒野の仮設テント — 夕刻'
    this.sceneBgText = this.add.text(width / 2, state.safeArea.top + 40, bgText, {
      fontSize: '16px',
      color: '#8899aa',
      fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    // メッセージウィンドウ領域
    const windowY = height * 0.55

    // キャラクターシルエット（絵文字で代用）
    const charEmoji = this.postDelivery ? '🧔' : '🏕️'
    const char = this.add.text(width / 2, windowY - 80, charEmoji, { fontSize: '64px' }).setOrigin(0.5)

    // 発言者名
    this.speakerNameText = this.add.text(state.safeArea.left + 24, windowY - 20, '', {
      fontSize: '20px',
      color: '#c49060',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })

    // ムード絵文字
    this.moodEmojiText = this.add.text(width - state.safeArea.right - 60, windowY - 20, '', {
      fontSize: '28px',
    }).setOrigin(1, 0)

    // メッセージテキスト
    this.messageText = this.add.text(state.safeArea.left + 24, windowY + 30, '', {
      fontSize: '18px',
      color: '#e0e0e0',
      fontFamily: 'system-ui, sans-serif',
      lineSpacing: 8,
      wordWrap: { width: width - state.safeArea.left - state.safeArea.right - 48 },
    })

    // 次へボタン（自作）
    this.nextButton = this.createNextButton()
    this.positionNextButton()

    // 初期ノード表示
    this.showCurrentNode()

    // リサイズ対応
    this.scale.on('resize', this.onResize, this)

    // タッチ/クリックで次へ
    this.input.on('pointerdown', this.advanceDialogue, this)
  }

  private drawBackground() {
    const { width, height } = this.scale
    this.bgGraphics.clear()
    // グラデーション風背景
    this.bgGraphics.fillGradientStyle(0x0f0f1a, 0x0f0f1a, 0x1a1a2e, 0x1a1a2e, 1)
    this.bgGraphics.fillRect(0, 0, width, height)
    // 装飾的なライン
    this.bgGraphics.lineStyle(1, 0x3d4a5c, 0.3)
    for (let y = 0; y < height; y += 40) {
      this.bgGraphics.beginPath()
      this.bgGraphics.moveTo(0, y)
      this.bgGraphics.lineTo(width, y)
      this.bgGraphics.strokePath()
    }
  }

  private createNextButton(): Phaser.GameObjects.Container {
    const { width, height } = this.scale
    const state = this.game.registry.get('gameState')

    const container = this.add.container(0, 0)

    // 背景（角丸長方形）
    const bg = this.add.graphics()
    bg.fillStyle(0x2d6a4f, 1)
    bg.fillRoundedRect(-90, -28, 180, 56, 12)

    // テキスト
    const text = this.add.text(0, 0, '次へ', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    container.add([bg, text])
    container.setSize(180, 56)

    // インタラクティブ領域
    const hitArea = new Phaser.Geom.Rectangle(-90, -28, 180, 56)
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => {
        container.setAlpha(0.7)
        this.advanceDialogue()
      })
      .on('pointerup', () => container.setAlpha(1))
      .on('pointerout', () => container.setAlpha(1))
      .on('pointerover', () => {})

    return container
  }

  private positionNextButton() {
    const { width, height } = this.scale
    const state = this.game.registry.get('gameState')
    this.nextButton.setPosition(width - state.safeArea.right - 90, height - state.safeArea.bottom - 60)
  }

  private showCurrentNode() {
    const nodes = this.postDelivery ? this.postDeliveryNodes : dialogueNodes
    const node = nodes[this.dialogueState.nodeId]
    if (!node) return

    // 発言者名
    const speakerColors: Record<string, number> = {
      narrator: 0x7a8a9a,
      gard: 0xc49060,
      錬金術師: 0x70b8a0,
    }
    this.speakerNameText.setText(node.speakerName)
    this.speakerNameText.setColor('#' + (speakerColors[node.speaker]?.toString(16).padStart(6, '0') || '7a8a9a'))

    // ムード絵文字
    this.moodEmojiText.setText(node.mood && MOOD_EMOJI[node.mood as keyof typeof MOOD_EMOJI] || '😐')

    // メッセージテキスト（タイプライター効果で表示）
    this.typewriterText(node.text)
  }

  private typewriterText(fullText: string) {
    this.messageText.setText('')
    let charIndex = 0

    const timer = this.time.addEvent({
      delay: 20,
      repeat: fullText.length,
      callback: () => {
        if (charIndex < fullText.length) {
          this.messageText.setText(fullText.substring(0, charIndex + 1))
          charIndex++
        } else {
          timer.destroy()
        }
      },
    })
  }

  private advanceDialogue() {
    const nodes = this.postDelivery ? this.postDeliveryNodes : dialogueNodes
    const node = nodes[this.dialogueState.nodeId]
    if (!node) return

    if (node.nextNodeId === null) {
      // 対話完了
      this.input.off('pointerdown', this.advanceDialogue, this)
      if (this.postDelivery) {
        // 納品後会話完了 → 次の日の処理やタイトルへ（Phase 3 で実装）
        // ひとまず最初の会話に戻す
        this.scene.start('DialogueScene')
      } else {
        // 本編会話完了 → LabScene へ
        this.scene.start('LabScene', { gameState: this.game.registry.get('gameState') })
      }
    } else {
      this.dialogueState.nodeId = node.nextNodeId
      this.showCurrentNode()
    }
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    const state = this.game.registry.get('gameState')
    state.updateSafeArea(gameSize.width, gameSize.height)
    this.bgGraphics.clear()
    this.drawBackground()
    this.positionNextButton()
    this.sceneBgText.setPosition(gameSize.width / 2, state.safeArea.top + 40)
  }

  shutdown() {
    this.scale.off('resize', this.onResize, this)
    this.input.off('pointerdown', this.advanceDialogue, this)
  }
}

// MOOD_EMOJI をインポートして使うためのローカル参照
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