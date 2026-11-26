import Phaser from 'phaser'
import { GameState } from '../state/GameState'
import {
  dialogueNodes,
  ep01Story,
  ep02Story,
  ep03Story,
  initialDialogueState,
  type DialogueState,
  type DialogueNode,
  getPostDeliveryNodes,
  getInitialPostDeliveryNodeId,
} from '../../lib/dialogueEngine'
import {
  recordCrafted,
  recordReaction,
  recordAnalysisTag,
  autoRecordStageNotes,
  type KnowledgeState,
} from '../../lib/knowledge'

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
  private episodeId = 'ep01'
  private dialogueNodes: Record<string, DialogueNode> = ep01Story

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
      episodeId?: string
    } | undefined
    this.postDelivery = initData?.postDelivery ?? false
    this.outcomeGrade = initData?.outcomeGrade ?? ''
    this.episodeId = initData?.episodeId ?? 'ep01'

    if (this.postDelivery) {
      this.postDeliveryNodes = getPostDeliveryNodes(this.outcomeGrade, this.episodeId)
      this.dialogueState.nodeId = getInitialPostDeliveryNodeId(this.outcomeGrade)
    } else {
      // エピソードに応じて本編会話を選択
      const storyMap: Record<string, Record<string, DialogueNode>> = {
        ep01: ep01Story,
        ep02: ep02Story,
        ep03: ep03Story,
      }
      this.dialogueNodes = storyMap[this.episodeId] || ep01Story
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
    const nodes = this.postDelivery ? this.postDeliveryNodes : this.dialogueNodes
    const node = nodes[this.dialogueState.nodeId]
    if (!node) return

    // 発言者名
    const speakerColors: Record<string, number> = {
      narrator: 0x7a8a9a,
      gard: 0xc49060,
      錬金術師: 0x70b8a0,
      nara: 0xd97757,
      merchant: 0x8bcfef,
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
    const nodes = this.postDelivery ? this.postDeliveryNodes : this.dialogueNodes
    const node = nodes[this.dialogueState.nodeId]
    if (!node) return

    if (node.nextNodeId === null) {
      // 対話完了
      this.input.off('pointerdown', this.advanceDialogue, this)
      if (this.postDelivery) {
        // 納品後会話完了 → 依頼人完了処理へ
        this.handlePostDeliveryComplete()
      } else {
        // 本編会話完了 → LabScene へ（episodeId を渡す）
        this.scene.start('LabScene', { 
          gameState: this.game.registry.get('gameState'),
          episodeId: this.episodeId,
        })
      }
    } else {
      this.dialogueState.nodeId = node.nextNodeId
      this.showCurrentNode()
    }
  }

  private handlePostDeliveryComplete() {
    const state = this.game.registry.get('gameState') as GameState
    const { trustDelta, reward } = this.getOutcomeRewards(this.outcomeGrade, this.episodeId)
    
    // 依頼人完了処理（GameState更新、知識ノート記録など）
    state.completeClient(this.episodeId, this.outcomeGrade as any, trustDelta, reward)
    
    // 知識ノートに記録
    const knowledgeState = this.game.registry.get('knowledgeState') as KnowledgeState
    if (knowledgeState) {
      // 品目記録
      const recipeName = this.getRecipeName(this.episodeId)
      recordCrafted(knowledgeState, {
        episodeId: this.episodeId,
        recipeId: this.episodeId + '-recipe',
        recipeName,
        qualityTier: this.gradeToQualityTier(this.outcomeGrade),
      })
      // 反応記録
      const clientName = this.getClientName(this.episodeId)
      const summary = this.getReactionSummary(this.episodeId, this.outcomeGrade)
      recordReaction(knowledgeState, {
        episodeId: this.episodeId,
        clientName,
        outcomeGrade: this.outcomeGrade as any,
        summary,
      })
      // 分析タグ記録
      const tags = this.getAnalysisTagsForClient(this.episodeId)
      tags.forEach(tag => recordAnalysisTag(knowledgeState, { episodeId: this.episodeId, label: tag, description: tag }))
    }

    // 次の依頼人または日の終わりへ
    if (state.isDayEnd) {
      this.scene.start('DayEndScene', { gameState: state, knowledgeState })
    } else {
      // 次の依頼人の会話へ
      this.scene.start('DialogueScene', { episodeId: state.currentEpisode })
    }
  }

  private getOutcomeRewards(grade: string, episodeId: string): { trustDelta: number; reward: number } {
    const rewards: Record<string, Record<string, { trustDelta: number; reward: number }>> = {
      ep01: { PERFECT: { trustDelta: 35, reward: 280 }, GOOD: { trustDelta: 18, reward: 160 }, PARTIAL: { trustDelta: 3, reward: 60 }, DAMAGED: { trustDelta: -30, reward: 0 } },
      ep02: { PERFECT: { trustDelta: 25, reward: 200 }, GOOD: { trustDelta: 12, reward: 120 }, PARTIAL: { trustDelta: 2, reward: 40 }, DAMAGED: { trustDelta: -20, reward: 0 } },
      ep03: { PERFECT: { trustDelta: 15, reward: 100 }, GOOD: { trustDelta: 8, reward: 60 }, PARTIAL: { trustDelta: 1, reward: 20 }, DAMAGED: { trustDelta: -10, reward: 0 } },
    }
    return rewards[episodeId]?.[grade] || { trustDelta: 0, reward: 0 }
  }

  private getRecipeName(episodeId: string): string {
    const names: Record<string, string> = {
      ep01: '古剣 腐食除去処置',
      ep02: '植物染料 媒染定着処理',
      ep03: '廃酸 中和処理',
    }
    return names[episodeId] || 'Unknown'
  }

  private gradeToQualityTier(grade: string): 'perfect' | 'good' | 'partial' | 'failed' {
    const map: Record<string, 'perfect' | 'good' | 'partial' | 'failed'> = {
      PERFECT: 'perfect',
      GOOD: 'good',
      PARTIAL: 'partial',
      DAMAGED: 'failed',
    }
    return map[grade] || 'failed'
  }

  private getClientName(episodeId: string): string {
    const names: Record<string, string> = {
      ep01: 'ガルド',
      ep02: 'ナーラ',
      ep03: '旅の商人',
    }
    return names[episodeId] || '不明'
  }

  private getReactionSummary(episodeId: string, grade: string): string {
    const summaries: Record<string, Record<string, string>> = {
      ep01: {
        PERFECT: '親父の顔が刃に映っている。本当にありがとう。',
        GOOD: '大分違うな。これなら実戦で使える。',
        PARTIAL: 'まだ深いところの錆が残ってる。もう一回、やり直せるか？',
        DAMAGED: '何をしてくれた！親父の形見が台無しだ！',
      },
      ep02: {
        PERFECT: '嘘……この色、ベニバナの紅そのままだ！媒染がきれいに決まってる。',
        GOOD: 'だいぶ良くなりました。色ムラもほとんど目立たない。',
        PARTIAL: 'まだ、色落ちしそうな部分がありますね……。',
        DAMAGED: '何これ……！ 色が完全に飛んでる！',
      },
      ep03: {
        PERFECT: '完璧だ。pH 7.0 ちょうど。指示薬の色変化も、試験紙の判定も、文句なし。',
        GOOD: '十分だ。pH 6.8……中性域に入ってる。多少の濁りは許容範囲内。',
        PARTIAL: 'pH 5.5……まだ酸性が残ってる。もう一回、重曹を足して確認してくれないか？',
        DAMAGED: 'pH 9.2……アルカリ性に振れすぎだ！重曹入れすぎだろ！',
      },
    }
    return summaries[episodeId]?.[grade] || ''
  }

  private getAnalysisTagsForClient(episodeId: string): string[] {
    const tags: Record<string, string[]> = {
      ep01: ['黒錆', '塩化物錆', '出自'],
      ep02: ['植物色素', '媒染剤', 'pH調整'],
      ep03: ['酸塩基中和', '指示薬'],
    }
    return tags[episodeId] || []
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