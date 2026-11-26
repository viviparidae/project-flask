import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { PreloadScene } from './scenes/PreloadScene'
import { CounterScene } from './scenes/CounterScene'
import { GameState } from './state/GameState'

// VA-11 Hall-A 風プロトタイプ：カウンター画面のみ
// 会話・調合・納品後反応を同一画面で完結
// HUD・知識ノート・夜の振り返り・結果画面・品質表示・スコア表示なし
// 対象：Ep.1 ガルドのみ

export class Game extends Phaser.Game {
  constructor() {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1280,
      height: 720,
      parent: 'game',
      backgroundColor: '#0a0a14',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: { width: 320, height: 180 },
        max: { width: 1920, height: 1080 },
      },
      dom: {
        createContainer: false,
      },
      scene: [BootScene, PreloadScene, CounterScene],
      physics: {
        default: 'arcade',
        arcade: { debug: false },
      },
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false,
      },
    }

    super(config)

    const gameState = new GameState()
    this.registry.set('gameState', gameState)
    // knowledgeState はこのプロトタイプでは使用しない（知識ノート画面なし）

    // Ep.1 固定で初期化（日の進行管理なし）
    gameState.currentEpisode = 'ep01'
    gameState.currentDay = 1
    gameState.clientQueue = []
    gameState.completedClients = []
    gameState.isDayEnd = false

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const state = this.registry.get('gameState') as GameState
      state.updateSafeArea(gameSize.width, gameSize.height)
    })

    this.scale.once('resize', (gameSize: Phaser.Structs.Size) => {
      const state = this.registry.get('gameState') as GameState
      state.updateSafeArea(gameSize.width, gameSize.height)
    })
  }
}