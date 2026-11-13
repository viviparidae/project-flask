// phaser-rexui.d.ts — phaser3-rex-plugins 型拡張
import 'phaser'

declare module 'phaser' {
  interface Scene {
    rexUI: any // rexUI プラグインのネームスペース（詳細型は別途定義可能）
  }

  interface GameObjects {
    // rexUI が追加するゲームオブジェクトファクトリメソッド
    // 実際の型は phaser3-rex-plugins の型定義を参照
  }
}

// phaser3-rex-plugins のグローバル宣言（CommonJS require 用）
declare const require: {
  (id: string): any
  (id: 'phaser3-rex-plugins/templates/ui/ui-plugin.js'): any
}