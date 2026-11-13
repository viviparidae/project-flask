import Phaser from 'phaser'

/**
 * HUDScene — 常駐ヘッダー（評判・所持金表示）
 * scene.run() で全シーンと並行実行
 */
export class HUDScene extends Phaser.Scene {
  private trustText!: Phaser.GameObjects.Text
  private goldText!: Phaser.GameObjects.Text
  private state!: any
  private bgGraphics!: Phaser.GameObjects.Graphics

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

    // 右：所持金
    this.goldText = this.add.text(width - 24, 20, '', {
      fontSize: '18px',
      color: '#e0e0e0',
      fontFamily: 'system-ui, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0)

    // アイコン
    this.add.text(24, 20, '📊 ', { fontSize: '18px' })
    this.add.text(width - 24, 20, ' 💰', { fontSize: '18px' }).setOrigin(1, 0)

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

  private updateDisplay() {
    const state = this.state
    const { width } = this.scale

    this.trustText.setText(`評判: ${state.trust}`)
    this.goldText.setText(`${state.gold}G`)
    this.goldText.setPosition(width - 24, 20 + state.safeArea.top)
    this.trustText.setPosition(24, 20 + state.safeArea.top)

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