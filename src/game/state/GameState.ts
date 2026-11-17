/**
 * GameState — シーン間で共有される永続ステート
 * Phaser Game.registry に保存され、全シーンからアクセス可能
 */
export class GameState {
  // 進行状態
  trust = 50              // 評判 (0〜100)
  gold = 80               // 所持金
  currentEpisode = 'ep01' // 現在のエピソード

  // エピソード1 固有
  ep01Completed = false
  ep01Result: 'PERFECT' | 'GOOD' | 'PARTIAL' | 'DAMAGED' | null = null

  // 学習進行（学習プログレッション試作）
  learnedNotes: string[] = []   // 獲得済み知識ノート ID
  practiceCount = 0             // 練習処置の累計回数

  hasLearned(noteId: string): boolean {
    return this.learnedNotes.includes(noteId)
  }

  /** ノートを獲得する。新規獲得なら true */
  learn(noteId: string): boolean {
    if (this.hasLearned(noteId)) return false
    this.learnedNotes.push(noteId)
    return true
  }

  // セーフエリア（ピクセル）
  safeArea = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }

  // 画面サイズ変更時にセーフエリアを再計算
  updateSafeArea(screenWidth: number, screenHeight: number) {
    this.safeArea = {
      top: Math.max(0, screenHeight * 0.05),     // ノッチ/ステータスバー
      bottom: Math.max(0, screenHeight * 0.08),  // ホームバー/ジェスチャー領域
      left: Math.max(0, screenWidth * 0.02),
      right: Math.max(0, screenWidth * 0.02),
    }
  }

  // セーフエリア内の有効領域を取得
  getSafeRect(gameWidth: number, gameHeight: number): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.safeArea.left,
      this.safeArea.top,
      gameWidth - this.safeArea.left - this.safeArea.right,
      gameHeight - this.safeArea.top - this.safeArea.bottom,
    )
  }

  // エピソード完了時の処理
  completeEpisode(result: 'PERFECT' | 'GOOD' | 'PARTIAL' | 'DAMAGED', trustDelta: number, reward: number) {
    this.trust = Math.max(0, Math.min(100, this.trust + trustDelta))
    this.gold += reward
    this.ep01Completed = true
    this.ep01Result = result
  }

  // 次のエピソードへリセット
  resetForNextEpisode() {
    this.ep01Completed = false
    this.ep01Result = null
    // trust と gold は引き継ぐ
  }
}