import Phaser from 'phaser'
import { GameState } from '../state/GameState'

/**
 * HUDScene — 常駐ヘッダー（評判・所持金・日数・依頼人進行表示）
 * scene.run() で全シーンと並行実行
 */
export class HUDScene extends Phaser.Scene {
  private trustText!: Phaser.GameObjects.Text
  private goldText!: Phaser.GameObjects.Text
  private dayText!: Phaser.GameObjects.Text
  private clientProgressText!: Phaser.GameObjects.Text
  private trustIconText!: Phaser.GameObjects.Text
  private goldIconText!: Phaser.GameObjects.Text
  private state!: GameState
  private bgGraphics!: Phaser.GameObjects.Graphics
  private lastTrust = Number.NaN
  private lastGold = Number.NaN
  private lastDay = Number.NaN
  private lastClientProgress = ''

  constructor() {
    super({ key: 'HUDScene' })
  }

  create() {
    this.state = this.game.registry.get('gameState')
    const { width } = this.scale

    // ヘッダー背景
    this.bgGraphics = this.add.graphics()
    this.drawHeader()

    // 左：評判
    this.trustText = this.add.text(24, 20, '', {
      fontSize: '18px',
      color: '#e0e0e0',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    })

    // 中央：日数・依頼人進行
    this.dayText = this.add.text(width / 2, 12, '', {
      fontSize: '14px',
      color: '#8bcfef',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.clientProgressText = this.add.text(width / 2, 32, '', {
      fontSize: '12px',
      color: '#94a3b8',
      fontFamily: 'system-ui, sans-serif',
    }).setOrigin(0.5)

    // 右：所持金
    this.goldText = this.add.text(width - 24, 20, '', {
      fontSize: '18px',
      color: '#e0e0e0',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0)

    // アイコン
    this.trustIconText = this.add.text(24, 20, '📊', { fontSize: '18px' })
    this.goldIconText = this.add.text(width - 24, 20, '💰', { fontSize: '18px' }).setOrigin(1, 0)

    this.updateDisplay()

    // GameState 変更監視（registry イベントで更新）
    this.game.registry.events.on('changedata', this.onDataChange, this)

    // リサイズ対応
    this.scale.on('resize', this.onResize, this)
  }

  private drawHeader() {
    const { width } = this.scale
    const state = this.state

    this.bgGraphics.clear()
    this.bgGraphics.fillStyle(0x0f0f1a, 0.95)
    this.bgGraphics.fillRect(0, 0, width, 56 + state.safeArea.top)
    this.bgGraphics.fillStyle(0x1a1a2e, 1)
    this.bgGraphics.fillRect(0, 56 + state.safeArea.top, width, 2)
  }

  update() {
    // GameState は plain オブジェクトなので registry の changedata では変更を検知できない。
    // 毎フレーム、表示中の値と実値が食い違ったら再描画する。
    if (this.state &&
        (this.state.trust !== this.lastTrust ||
         this.state.gold !== this.lastGold ||
         this.state.currentDay !== this.lastDay ||
         this.getClientProgressString() !== this.lastClientProgress)) {
      this.updateDisplay()
    }
  }

  private getClientProgressString(): string {
    const total = this.state.completedClients.length + this.state.clientQueue.length
    const completed = this.state.completedClients.length
    if (total === 0) return ''
    return `${completed}/${total}`
  }

  private updateDisplay() {
    const state = this.state
    const { width } = this.scale
    this.lastTrust = state.trust
    this.lastGold = state.gold
    this.lastDay = state.currentDay
    this.lastClientProgress = this.getClientProgressString()

    this.trustText.setText(`評判: ${state.trust}`)
    this.goldText.setText(`${state.gold}G`)
    this.dayText.setText(`第${state.currentDay}日`)
    this.clientProgressText.setText(this.getClientProgressString() ? `依頼: ${this.getClientProgressString()} 完了` : '依頼人を待機中')

    const textY = 20 + state.safeArea.top
    this.trustIconText.setPosition(24, textY)
    this.trustText.setPosition(52, textY)
    this.dayText.setPosition(width / 2, 12 + state.safeArea.top)
    this.clientProgressText.setPosition(width / 2, 32 + state.safeArea.top)
    this.goldIconText.setPosition(width - 24, textY)
    this.goldText.setPosition(width - 52, textY)

    // セーフエリア対応で背景再描画
    this.drawHeader()
  }

  private onDataChange(parent: any, key: string, value: any) {
    if (key === 'trust' || key === 'gold') {
      this.updateDisplay()
    }
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    const state = this.game.registry.get('gameState')
    state.updateSafeArea(gameSize.width, gameSize.height)
    this.drawHeader()
    this.updateDisplay()
  }

  shutdown() {
    this.game.registry.events.off('changedata', this.onDataChange, this)
    this.scale.off('resize', this.onResize, this)
  }
}