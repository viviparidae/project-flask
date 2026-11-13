import Phaser from 'phaser'

/**
 * PreloadScene — アセット読み込み
 * 画像アセットは将来的に追加、現在はプレースホルダのみ
 * すぐに DialogueScene へ遷移（HUDScene も並行起動）
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload() {
    console.log('[PreloadScene] preload')
    // 将来的なアセット読み込みプレースホルダ
    // this.load.image('bg-tent', 'assets/bg-tent.png')
    // this.load.image('char-gard', 'assets/char-gard.png')
    // this.load.audio('sfx-click', 'assets/sfx-click.ogg')

    // プログレスバー表示（ベクター描画）
    const progressBar = this.add.graphics()
    const progressBox = this.add.graphics()
    const { width, height } = this.scale

    progressBox.fillStyle(0x222233, 0.8)
    progressBox.fillRoundedRect(width / 2 - 160, height / 2 - 20, 320, 40, 10)

    this.load.on('progress', (value: number) => {
      progressBar.clear()
      progressBar.fillStyle(0x65e6ad, 1)
      progressBar.fillRoundedRect(width / 2 - 150, height / 2 - 10, 300 * value, 20, 10)
    })

    this.load.on('complete', () => {
      progressBar.destroy()
      progressBox.destroy()
    })
  }

  create() {
    console.log('[PreloadScene] create - starting HUDScene and DialogueScene')
    // HUDScene を並行起動（常駐）
    this.scene.run('HUDScene')

    // メインシーンへ
    this.scene.start('DialogueScene')
  }
}