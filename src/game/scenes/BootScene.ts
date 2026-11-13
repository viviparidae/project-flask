import Phaser from 'phaser'

/**
 * BootScene — 初期設定・スケール・セーフエリア計算
 * すぐに PreloadScene へ遷移
 */
export class BootScene extends Phaser.Scene {
  private createCalled = false

  constructor() {
    super({ key: 'BootScene' })
  }

  create() {
    this.createCalled = true
    console.log('[BootScene] create called')
    
    // セーフエリア初期計算（create() で実行）
    const state = this.game.registry.get('gameState')
    state.updateSafeArea(this.scale.width, this.scale.height)
    
    console.log('[BootScene] starting PreloadScene')
    this.scene.start('PreloadScene')
    console.log('[BootScene] scene.start called')
  }
}