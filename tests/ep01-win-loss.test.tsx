import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../src/App'
import { judgeRestoration } from '../src/lib/fateEngine'
import {
  calculateReaction,
  reactionInputFromAttempt,
  type ReactionInput,
} from '../src/lib/reactionEngine'
import {
  RECIPE_EP01,
  matchRecipe,
  type RecipeAttempt,
} from '../src/lib/recipeEngine'

// 仕様の根拠: docs/story/ep01-ancient-sword.md
// - リン酸 最適: 濃度 Lv.3〜4 / 温度 35〜45℃、除去力 1.00（推奨）
// - 塩酸 最適: 濃度 Lv.2〜3 / 温度 20〜35℃、クエン酸 最適: 濃度 Lv.3〜5 / 温度 40〜55℃
// - 有害ガス発生: HCl かつ 濃度≥4 かつ 温度≥45℃
// - 結末: スコア≥80 PERFECT(+35/280G)、55〜79 GOOD(+18/160G)、
//   25〜54 PARTIAL(+3/60G)、<25 DAMAGED(-30/0G)、ガス事故 DAMAGED(-40/0G)
// - UI の温度対応（実行時）: 低温 20℃ / 中温 40℃ / 高温 55℃、
//   濃度対応: 薄め Lv.2 / 標準 Lv.3 / 濃め Lv.5
// - 手順「短時間処置」では深部の錆に届かない（レシピの requiredProcedure は standard）

const CORRECT: RecipeAttempt = {
  acid: 'Phosphoric',
  concentration: 'standard',
  temperature: 'warm',
  procedure: 'standard',
}

function scoreOf(attempt: RecipeAttempt): number {
  return calculateReaction(reactionInputFromAttempt(attempt)).restorationScore
}

describe('[REQ-EP01] 勝敗判定 — reactionEngine', () => {
  it('正解の処置（リン酸・標準・中温・標準手順）で錆除去率100%・スコア100になる', () => {
    const result = calculateReaction(reactionInputFromAttempt(CORRECT))

    expect(result.corrosionRemoved).toBe(100)
    expect(result.metalDamage).toBe(0)
    expect(result.byproductHazard).toBe(false)
    expect(result.restorationScore).toBe(100)
  })

  it('正解の処置は UI の全36通りの中で唯一 PERFECT（80以上）に届く', () => {
    const acids = ['HCl', 'Citric', 'Phosphoric'] as const
    const concs = ['light', 'standard', 'strong'] as const
    const temps = ['cold', 'warm', 'hot'] as const
    const procs = ['quick', 'standard'] as const

    const scores = acids.flatMap((acid) =>
      concs.flatMap((concentration) =>
        temps.flatMap((temperature) =>
          procs.map((procedure) =>
            scoreOf({ acid, concentration, temperature, procedure }),
          ),
        ),
      ),
    )

    expect(Math.max(...scores)).toBeGreaterThanOrEqual(80)
    expect(scores.filter((s) => s >= 80)).toHaveLength(1)
    // 正解の処方（酸・濃度・温度）以外は GOOD（55）にも届かない。
    // ※手順だけ短時間に変えた正解処方は GOOD 帯（60）になる仕様（下記テスト参照）のため、
    //   ここでは「処方の3要素が正解の組み合わせ」を除外して検証する。
    const others = acids.flatMap((acid) =>
      concs.flatMap((concentration) =>
        temps.flatMap((temperature) =>
          procs.map((procedure) => ({ acid, concentration, temperature, procedure })),
        ),
      ),
    ).filter(
      (a) =>
        !(
          a.acid === CORRECT.acid &&
          a.concentration === CORRECT.concentration &&
          a.temperature === CORRECT.temperature
        ),
    )
    expect(Math.max(...others.map(scoreOf))).toBeLessThan(55)
  })

  it('短時間処置では深部の錆に届かず PERFECT にならない（GOOD 相当の60）', () => {
    const result = calculateReaction(
      reactionInputFromAttempt({ ...CORRECT, procedure: 'quick' }),
    )

    expect(result.restorationScore).toBe(60)
    expect(judgeRestoration(result.restorationScore, false).grade).toBe('GOOD')
  })

  it('塩酸・濃め・高温は有害副産物（塩化水素ガス）が発生する', () => {
    const result = calculateReaction(
      reactionInputFromAttempt({
        acid: 'HCl',
        concentration: 'strong',
        temperature: 'hot',
        procedure: 'standard',
      }),
    )

    expect(result.byproductHazard).toBe(true)
  })

  it('仕様の温度範囲を直接の数値でも確認する（リン酸 35〜45℃が最適）', () => {
    const at = (temperature: number): ReactionInput => ({
      acidType: 'Phosphoric',
      concentration: 3,
      temperature,
      procedure: 'standard',
    })

    expect(calculateReaction(at(40)).restorationScore).toBe(100)
    expect(calculateReaction(at(20)).restorationScore).toBeLessThan(25)
    expect(calculateReaction(at(75)).restorationScore).toBeLessThan(25)
  })
})

describe('[REQ-EP01] 勝敗判定 — fateEngine', () => {
  it.each([
    [100, 'PERFECT', 35, 280],
    [80, 'PERFECT', 35, 280],
    [79, 'GOOD', 18, 160],
    [55, 'GOOD', 18, 160],
    [54, 'PARTIAL', 3, 60],
    [25, 'PARTIAL', 3, 60],
    [24, 'DAMAGED', -30, 0],
    [0, 'DAMAGED', -30, 0],
  ] as const)(
    'スコア %i は %s（評判 %+i / 報酬 %iG）',
    (score, grade, trustDelta, reward) => {
      const outcome = judgeRestoration(score, false)

      expect(outcome.grade).toBe(grade)
      expect(outcome.trustDelta).toBe(trustDelta)
      expect(outcome.reward).toBe(reward)
    },
  )

  it('有害副産物があればスコアに関係なくガス事故（評判 -40 / 報酬 0G）', () => {
    const outcome = judgeRestoration(100, true)

    expect(outcome.grade).toBe('DAMAGED')
    expect(outcome.resultTitle).toMatch(/事故発生/)
    expect(outcome.trustDelta).toBe(-40)
    expect(outcome.reward).toBe(0)
  })
})

describe('[REQ-EP01] 勝敗判定 — recipeEngine', () => {
  it('正解の処置はレシピ照合 PERFECT（4/4）', () => {
    const result = matchRecipe(RECIPE_EP01, CORRECT)

    expect(result.grade).toBe('PERFECT')
    expect(result.matchScore).toBe(4)
    expect(result.isAccident).toBe(false)
  })

  it('塩酸・濃め・高温はレシピ照合でも事故', () => {
    const result = matchRecipe(RECIPE_EP01, {
      acid: 'HCl',
      concentration: 'strong',
      temperature: 'hot',
      procedure: 'standard',
    })

    expect(result.isAccident).toBe(true)
    expect(result.grade).toBe('ACCIDENT')
  })

  it('手順だけ違うと PERFECT にならない', () => {
    const result = matchRecipe(RECIPE_EP01, { ...CORRECT, procedure: 'quick' })

    expect(result.grade).not.toBe('PERFECT')
    expect(result.matchScore).toBe(3)
  })
})

// ────────────────────────────────────────
// App の UI 経由の勝敗（プレビュー表示と実行結果の一致を含む）
// ────────────────────────────────────────
async function gotoLab(user: ReturnType<typeof userEvent.setup>) {
  render(<App />)
  for (let i = 0; i < 9; i++) {
    await user.click(screen.getAllByRole('button', { name: /次へ/ })[0])
  }
  await user.click(screen.getByRole('button', { name: /処置に進む/ }))
}

async function execute(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /処置を実行する/ }))
}

describe('[REQ-EP01] 勝敗判定 — App（UI 経由）', () => {
  it('初期選択（正解）のまま実行すると「完全修復」PERFECT になる', async () => {
    const user = userEvent.setup()
    await gotoLab(user)

    // プレビュー表示も実行結果と一致する（錆除去率 100%）
    expect(screen.getByText(/錆除去率: 100%/)).toBeInTheDocument()

    await execute(user)

    expect(screen.getByText(/完全修復/)).toBeInTheDocument()
    expect(screen.getByText(/\+35 → 85/)).toBeInTheDocument()
    expect(screen.getByText(/\+280G → 360G/)).toBeInTheDocument()
  })

  it('短時間処置に変えると PERFECT にならず「良好な修復」になる', async () => {
    const user = userEvent.setup()
    await gotoLab(user)

    // ラベルは完全一致で選ぶこと。/高温/ のような部分一致だと、
    // クエン酸ボタンの説明文「高温・高濃度でないと効果薄」にも当たり、
    // 温度ではなく試薬がクエン酸に変わってしまう。
    await user.click(screen.getByText('短時間処置'))
    await execute(user)

    expect(screen.getByText(/良好な修復/)).toBeInTheDocument()
    expect(screen.queryByText(/完全修復/)).not.toBeInTheDocument()
  })

  it('塩酸・濃め・高温で実行するとガス事故になる', async () => {
    const user = userEvent.setup()
    await gotoLab(user)

    await user.click(screen.getByRole('button', { name: /塩酸/ }))
    await user.click(screen.getByRole('button', { name: /濃め/ }))
    await user.click(screen.getByRole('button', { name: /^高温/ }))
    await execute(user)

    expect(screen.getByText(/事故発生/)).toBeInTheDocument()
    expect(screen.getByText(/-40 → 10/)).toBeInTheDocument()
  })
})
