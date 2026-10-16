import { useState } from 'react'
import {
  dialogueNodes,
  type DialogueState,
  initialDialogueState,
  type Mood,
} from './lib/dialogueEngine'
import {
  matchRecipe,
  type Recipe,
  type RecipeAttempt,
  type AcidChoice,
  type ConcChoice,
  type TempChoice,
  type ProcChoice,
  ACID_LABELS,
  CONC_LABELS,
  TEMP_LABELS,
  PROC_LABELS,
  RECIPE_EP01,
} from './lib/recipeEngine'
import { calculateReaction, type AcidType } from './lib/reactionEngine'
import { judgeRestoration, type FateOutcome } from './lib/fateEngine'

type Phase = 'dialogue' | 'lab' | 'result'

const SPEAKER_COLORS: Record<string, string> = {
  narrator: '#7a8a9a',
  gard: '#c49060',
  chemist: '#70b8a0',
}

function moodBadge(mood: Mood) {
  const emoji: Record<Mood, string> = {
    neutral: '😐',
    sad: '😔',
    tense: '😤',
    hopeful: '🙂',
    analytical: '🤔',
    angry: '😡',
  }
  return emoji[mood]
}

function charEmoji(speaker: string, mood: Mood) {
  if (speaker === 'narrator') return '🏕️'
  if (speaker === 'gard') return '🧔'
  if (speaker === 'chemist') return '⚗️'
  return moodBadge(mood)
}

// ────────────────────────────────────────
// ステータスバー
// ────────────────────────────────────────
function StatusBar({ trust, gold }: { trust: number; gold: number }) {
  return (
    <div className="status-bar">
      <span className="stat trust">
        <span className="stat-label">評判</span>
        <span className="stat-value">{trust}</span>
      </span>
      <span className="stat gold">
        <span className="stat-label">所持金</span>
        <span className="stat-value">{gold}G</span>
      </span>
    </div>
  )
}

// ────────────────────────────────────────
// フェーズ1: 物語（線形対話）
// ────────────────────────────────────────
function DialoguePhase({
  dialogueState,
  onAdvance,
}: {
  dialogueState: DialogueState
  onAdvance: () => void
}) {
  const node = dialogueNodes[dialogueState.nodeId]
  const isEnd = node.nextNodeId === null

  return (
    <div className="adv-screen">
      <div className="scene-area">
        <div className="char-silhouette">
          <span className="char-emoji">{charEmoji(node.speaker, node.mood)}</span>
        </div>
        <div className="scene-bg-text">荒野の仮設テント — 夕刻</div>
      </div>

      <div className="message-window">
        <div className="speaker-row">
          <span
            className="speaker-name"
            style={{ color: SPEAKER_COLORS[node.speaker] ?? '#7a8a9a' }}
          >
            {node.speakerName}
          </span>
          <span className="mood-badge" data-mood={node.mood}>
            {moodBadge(node.mood)}
          </span>
        </div>
        <p className="message-text">{node.text}</p>
      </div>

      <button className="next-btn" onClick={onAdvance}>
        {isEnd ? '処置に進む →' : '次へ'}
      </button>
    </div>
  )
}

// ────────────────────────────────────────
// フェーズ2: ラボ（レシピブック形式）
// ────────────────────────────────────────
function LabPhase({
  recipe,
  attempt,
  setAttempt,
  onExecute,
}: {
  recipe: Recipe
  attempt: RecipeAttempt
  setAttempt: (a: RecipeAttempt) => void
  onExecute: () => void
}) {
  const result = matchRecipe(recipe, attempt)
  const reaction = calculateReaction({
    acidType: attempt.acid as AcidType,
    concentration: attempt.concentration === 'light' ? 2 : attempt.concentration === 'standard' ? 3 : 5,
    temperature: attempt.temperature === 'cold' ? 55 : attempt.temperature === 'warm' ? 75 : 90,
  })

  const gradeColors: Record<string, string> = {
    PERFECT: '#65e6ad',
    GOOD: '#8bcfef',
    PARTIAL: '#f6c94e',
    FAIL: '#f87171',
    ACCIDENT: '#ff4444',
  }

  return (
    <div className="lab-screen">
      <div className="lab-header">
        <span className="lab-phase-label">🔬 処置ラボ</span>
        <span className="lab-hint">依頼内容を確認し、適切な条件を選んでください</span>
      </div>

      {/* 依頼カード */}
      <div className="request-card">
        <div className="request-card-header">
          <span className="request-name">{recipe.name}</span>
          <span className="request-compound">{recipe.compound}</span>
        </div>
        <div className="request-hints">
          {recipe.hints.map((h, i) => (
            <span key={i} className="hint-tag">★ {h}</span>
          ))}
        </div>
      </div>

      {/* セレクターグリッド */}
      <div className="selector-grid">
        <div className="selector-group">
          <label className="sel-label">試薬</label>
          <div className="sel-options">
            {(['HCl', 'Citric', 'Phosphoric'] as AcidChoice[]).map((a) => (
              <button
                key={a}
                className={`sel-btn ${attempt.acid === a ? 'active' : ''}`}
                onClick={() => setAttempt({ ...attempt, acid: a })}
              >
                <span className="sel-btn-label">{ACID_LABELS[a].short}</span>
                <span className="sel-btn-note">{ACID_LABELS[a].note}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="selector-group">
          <label className="sel-label">濃度</label>
          <div className="sel-options">
            {(['light', 'standard', 'strong'] as ConcChoice[]).map((c) => (
              <button
                key={c}
                className={`sel-btn ${attempt.concentration === c ? 'active' : ''}`}
                onClick={() => setAttempt({ ...attempt, concentration: c })}
              >
                <span className="sel-btn-label">{CONC_LABELS[c].short}</span>
                <span className="sel-btn-note">{CONC_LABELS[c].note}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="selector-group">
          <label className="sel-label">温度</label>
          <div className="sel-options">
            {(['cold', 'warm', 'hot'] as TempChoice[]).map((t) => (
              <button
                key={t}
                className={`sel-btn ${attempt.temperature === t ? 'active' : ''}`}
                onClick={() => setAttempt({ ...attempt, temperature: t })}
              >
                <span className="sel-btn-label">{TEMP_LABELS[t].short}</span>
                <span className="sel-btn-note">{TEMP_LABELS[t].note}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="selector-group">
          <label className="sel-label">手順</label>
          <div className="sel-options">
            {(['quick', 'standard'] as ProcChoice[]).map((p) => (
              <button
                key={p}
                className={`sel-btn ${attempt.procedure === p ? 'active' : ''}`}
                onClick={() => setAttempt({ ...attempt, procedure: p })}
              >
                <span className="sel-btn-label">{PROC_LABELS[p].short}</span>
                <span className="sel-btn-note">{PROC_LABELS[p].note}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* プレビューパネル */}
      <div className="preview-panel">
        <div className="preview-grade" style={{ color: gradeColors[result.grade] }}>
          {result.grade === 'ACCIDENT' ? '💥' : result.grade === 'PERFECT' ? '✨' : result.grade === 'GOOD' ? '🗡️' : result.grade === 'PARTIAL' ? '⚠️' : '💀'}
          {' '}{result.grade}
        </div>
        <div className="preview-match">
          {result.matchScore} / 4 パラメータ一致
        </div>
        {result.isAccident && (
          <div className="preview-danger">
            ⚠️ 危険な組み合わせです — 事故が発生します
          </div>
        )}
        <div className="preview-detail">
          <span>錆除去率: {reaction.corrosionRemoved}%</span>
          <span>金属侵食: {reaction.metalDamage > 0 ? `${reaction.metalDamage}%` : 'なし'}</span>
          <span>有害副産物: {reaction.byproductHazard ? '⚠️ あり' : '✅ なし'}</span>
        </div>
      </div>

      <button className="dispense-btn" onClick={onExecute}>
        🗡️ 処置を実行する
      </button>
    </div>
  )
}

// ────────────────────────────────────────
// フェーズ3: 処置結果
// ────────────────────────────────────────
function ResultPhase({
  outcome,
  trust,
  gold,
  onRestart,
}: {
  outcome: FateOutcome
  trust: number
  gold: number
  onRestart: () => void
}) {
  const isGood = outcome.grade === 'PERFECT' || outcome.grade === 'GOOD'
  const gradeEmoji: Record<string, string> = {
    PERFECT: '✨',
    GOOD: '🗡️',
    PARTIAL: '⚠️',
    FAIL: '💀',
    ACCIDENT: '💥',
  }

  return (
    <div className={`result-screen ${isGood ? 'result-good' : 'result-bad'}`}>
      <div className="result-grade-badge" style={{ color: isGood ? '#65e6ad' : '#f87171' }}>
        {gradeEmoji[outcome.grade]} {outcome.grade}
      </div>
      <h2 className="result-title">{outcome.resultTitle}</h2>
      <p className="result-story">{outcome.resultText}</p>

      {outcome.reputationNote && (
        <div className="reputation-note">
          <span>📣</span> {outcome.reputationNote}
        </div>
      )}

      <div className="result-stats">
        <div className="result-stat-item">
          <span>評判</span>
          <strong className={outcome.trustDelta >= 0 ? 'plus' : 'minus'}>
            {outcome.trustDelta >= 0 ? '+' : ''}
            {outcome.trustDelta} → {trust}
          </strong>
        </div>
        <div className="result-stat-item">
          <span>報酬</span>
          <strong className={outcome.reward > 0 ? 'plus' : 'minus'}>
            +{outcome.reward}G → {gold}G
          </strong>
        </div>
      </div>

      <button className="restart-btn" onClick={onRestart}>
        次の依頼を待つ →
      </button>
    </div>
  )
}

// ────────────────────────────────────────
// メイン App
// ────────────────────────────────────────
function App() {
  const [phase, setPhase] = useState<Phase>('dialogue')
  const [dialogueState, setDialogueState] = useState(initialDialogueState)
  const [attempt, setAttempt] = useState<RecipeAttempt>({
    acid: 'Phosphoric',
    concentration: 'standard',
    temperature: 'warm',
    procedure: 'standard',
  })
  const [outcome, setOutcome] = useState<FateOutcome | null>(null)
  const [trust, setTrust] = useState(50)
  const [gold, setGold] = useState(80)

  const currentNode = dialogueNodes[dialogueState.nodeId]
  const isDialogueEnd = currentNode.nextNodeId === null

  const handleAdvance = () => {
    if (isDialogueEnd) {
      setPhase('lab')
    } else {
      const nextId = currentNode.nextNodeId
      if (nextId) {
        setDialogueState((prev) => ({ ...prev, nodeId: nextId }))
      }
    }
  }

  const handleExecute = () => {
    const reaction = calculateReaction({
      acidType: attempt.acid as AcidType,
      concentration: attempt.concentration === 'light' ? 2 : attempt.concentration === 'standard' ? 3 : 5,
      temperature: attempt.temperature === 'cold' ? 20 : attempt.temperature === 'warm' ? 40 : 55,
    })
    const fate = judgeRestoration(reaction.restorationScore, reaction.byproductHazard)
    setOutcome(fate)
    setTrust((t) => Math.max(0, t + fate.trustDelta))
    setGold((g) => g + fate.reward)
    setPhase('result')
  }

  const handleRestart = () => {
    setDialogueState(initialDialogueState)
    setAttempt({
      acid: 'Phosphoric',
      concentration: 'standard',
      temperature: 'warm',
      procedure: 'standard',
    })
    setOutcome(null)
    setPhase('dialogue')
  }

  return (
    <div className="game-root">
      <header className="game-header">
        <div className="game-title">
          <span className="game-title-icon">⚗️</span>
          <div>
            <p className="game-subtitle">Chemistry Adventure</p>
            <h1 className="game-name">Project: FLASK</h1>
          </div>
        </div>
        <StatusBar trust={trust} gold={gold} />
      </header>

      <div className="phase-indicator">
        <span className={`phase-step ${phase === 'dialogue' ? 'active' : ''}`}>
          1. 対話
        </span>
        <span className="phase-arrow">›</span>
        <span className={`phase-step ${phase === 'lab' ? 'active' : ''}`}>
          2. 処置
        </span>
        <span className="phase-arrow">›</span>
        <span className={`phase-step ${phase === 'result' ? 'active' : ''}`}>
          3. 結果
        </span>
      </div>

      <main className="game-main">
        {phase === 'dialogue' && (
          <DialoguePhase
            dialogueState={dialogueState}
            onAdvance={handleAdvance}
          />
        )}
        {phase === 'lab' && (
          <LabPhase
            recipe={RECIPE_EP01}
            attempt={attempt}
            setAttempt={setAttempt}
            onExecute={handleExecute}
          />
        )}
        {phase === 'result' && outcome && (
          <ResultPhase
            outcome={outcome}
            trust={trust}
            gold={gold}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  )
}

export default App