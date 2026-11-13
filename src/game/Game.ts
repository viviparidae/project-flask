import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { PreloadScene } from './scenes/PreloadScene'
import { DialogueScene } from './scenes/DialogueScene'
import { LabSceneVA11 } from './scenes/LabSceneVA11'
import { ResultScene } from './scenes/ResultScene'
import { HUDScene } from './scenes/HUDScene'
import { GameState } from './state/GameState'

export class Game extends Phaser.Game {
  constructor() {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1280,
      height: 720,
      parent: 'game',
      backgroundColor: '#1a1a2e',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: { width: 320, height: 180 },
        max: { width: 1920, height: 1080 },
      },
      dom: {
        createContainer: false,
      },
      scene: [BootScene, PreloadScene, DialogueScene, LabSceneVA11, ResultScene, HUDScene],
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

    this.registry.set('gameState', new GameState())

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