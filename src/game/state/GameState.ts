/**
 * GameState — シーン間で共有される永続ステート
 * Phaser Game.registry に保存され、全シーンからアクセス可能
 */
export class GameState {
  // 進行状態
  trust = 50              // 評判 (0〜100)
  gold = 80               // 所持金
  currentEpisode = 'ep01' // 現在のエピソード

  // Phase 3: 1日の進行管理
  currentDay = 1                    // 現在の日数
  clientQueue: string[] = []        // 今日の依頼人キュー（エピソードID）
  completedClients: string[] = []   // 完了済み依頼人
  isDayEnd = false                  // 日の終わり（振り返り）フラグ

  // エピソード1 固有
  ep01Completed = false
  ep01Result: 'PERFECT' | 'GOOD' | 'PARTIAL' | 'DAMAGED' | null = null

  // エピソード2 固有
  ep02Completed = false
  ep02Result: 'PERFECT' | 'GOOD' | 'PARTIAL' | 'DAMAGED' | null = null

  // エピソード3 固有
  ep03Completed = false
  ep03Result: 'PERFECT' | 'GOOD' | 'PARTIAL' | 'DAMAGED' | null = null

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
    this.ep02Completed = false
    this.ep02Result = null
    this.ep03Completed = false
    this.ep03Result = null
    // trust と gold は引き継ぐ
  }

  // Phase 3: 1日の初期化（依頼人キューをセットアップ）
  initializeDay() {
    this.currentDay++
    this.clientQueue = ['ep01', 'ep02', 'ep03']
    this.completedClients = []
    this.isDayEnd = false
    this.currentEpisode = 'ep01'
  }

  // 現在の依頼人を取得
  getCurrentClient(): string | null {
    if (this.clientQueue.length === 0) return null
    return this.clientQueue[0]
  }

  // 依頼人完了処理
  completeClient(episodeId: string, result: 'PERFECT' | 'GOOD' | 'PARTIAL' | 'DAMAGED', trustDelta: number, reward: number) {
    this.trust = Math.max(0, Math.min(100, this.trust + trustDelta))
    this.gold += reward
    this.completedClients.push(episodeId)
    this.clientQueue.shift()

    // エピソード固有の結果を記録
    switch (episodeId) {
      case 'ep01':
        this.ep01Completed = true
        this.ep01Result = result
        break
      case 'ep02':
        this.ep02Completed = true
        this.ep02Result = result
        break
      case 'ep03':
        this.ep03Completed = true
        this.ep03Result = result
        break
    }

    // 次の依頼人へ、または日の終わりへ
    if (this.clientQueue.length > 0) {
      this.currentEpisode = this.clientQueue[0]
    } else {
      this.isDayEnd = true
    }
  }

  // 日の終わり（振り返り）完了
  completeDayEnd() {
    this.isDayEnd = false
    // 次の日の準備は次回 initializeDay で行う
  }
}