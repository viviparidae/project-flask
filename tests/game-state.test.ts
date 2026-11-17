import { describe, expect, it } from 'vitest'
import { GameState } from '../src/game/state/GameState'

/**
 * [GameState 検証]
 * completeEpisode が評判・所持金へ正しく反映されること。
 * VA11 フローでは従来 LabSceneVA11 から呼ばれておらず、結果が表示だけで
 * 終わっていた（HUD が初期値のままになる）バグの回帰防止。
 */
describe('[GameState] completeEpisode', () => {
  it('初期値は評判50・所持金80', () => {
    const s = new GameState()
    expect(s.trust).toBe(50)
    expect(s.gold).toBe(80)
    expect(s.ep01Completed).toBe(false)
  })

  it('GOOD の結果が評判+18・報酬160G として反映される', () => {
    const s = new GameState()
    s.completeEpisode('GOOD', 18, 160)
    expect(s.trust).toBe(68)
    expect(s.gold).toBe(240)
    expect(s.ep01Completed).toBe(true)
    expect(s.ep01Result).toBe('GOOD')
  })

  it('評判は 0〜100 に収まる', () => {
    const s = new GameState()
    s.completeEpisode('PERFECT', 80, 280)
    expect(s.trust).toBe(100)
    const t = new GameState()
    t.completeEpisode('DAMAGED', -80, 0)
    expect(t.trust).toBe(0)
    expect(t.gold).toBe(80)
  })

  it('resetForNextEpisode は完了フラグだけ戻し、評判・所持金は引き継ぐ', () => {
    const s = new GameState()
    s.completeEpisode('GOOD', 18, 160)
    s.resetForNextEpisode()
    expect(s.ep01Completed).toBe(false)
    expect(s.ep01Result).toBeNull()
    expect(s.trust).toBe(68)
    expect(s.gold).toBe(240)
  })
})
