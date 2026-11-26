// phaser-rexui.d.ts — phaser3-rex-plugins 型拡張
import 'phaser'

declare module 'phaser' {
  interface Scene {
    rexUI: PhaserRexUI
  }

  interface GameObjects {
    // rexUI が追加するゲームオブジェクトファクトリメソッド
  }
}

// phaser3-rex-plugins のグローバル宣言（CommonJS require 用）
declare const require: {
  (id: string): any
  (id: 'phaser3-rex-plugins/templates/ui/ui-plugin.js'): any
}

// 最小限の rexUI 型定義（any で柔軟に対応）
interface PhaserRexUI {
  add: {
    roundRectangle: (...args: any[]) => any
    label: (...args: any[]) => any
    sizer: (...args: any[]) => any
    scroller: (...args: any[]) => any
    gridSizer: (...args: any[]) => any
    // 他のメソッドは必要に応じて追加
  }
}