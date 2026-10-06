import { useState } from 'react'
import { Beaker, FlaskConical, Gauge, HeartPulse, Microscope, Sparkles } from 'lucide-react'
import { calculatePurity } from './lib/purityEngine'

const diagnosisOptions = [
  { label: '痛みを確認', detail: '患者の症状を確認する' },
  { label: '体調を確認', detail: '状態を整理する' },
]

function App() {
  const [selectedAction, setSelectedAction] = useState('')
  const [temperature, setTemperature] = useState(75)
  const [catalystDrops, setCatalystDrops] = useState(2)
  const [equipmentTier, setEquipmentTier] = useState(3)

  const result = calculatePurity({
    reactants: ['SalicylicAcid', 'AceticAnhydride'],
    catalystDrops,
    targetTemperature: temperature,
    reactionTimeSeconds: 10,
    equipmentTier,
  })

  const selectDiagnosis = () => {
    setSelectedAction('痛みを確認')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><FlaskConical size={24} /></span>
          <div>
            <p className="eyebrow">Clinical chemistry adventure</p>
            <h1>Project: FLASK</h1>
          </div>
        </div>
        <span className="status"><span /> Standalone frontend</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">REACT + VITE + TYPESCRIPT</p>
          <h2>純度を調整し、患者の運命を変える。</h2>
          <p>フロントエンド単体で完結する、決定論的な化学シミュレーションと対話体験を提供します。</p>
        </div>
        <div className="hero-stat">
          <Sparkles size={22} />
          <div><strong>100%</strong><span>決定論的実行</span></div>
        </div>
      </section>

      <section className="workspace">
        <article className="panel consultation-panel">
          <div className="section-heading">
            <div className="icon-box"><HeartPulse size={22} /></div>
            <div><p className="eyebrow">UC-01</p><h3>患者との対話</h3></div>
          </div>
          <p className="prompt">患者の状態を確認し、適切な治療ターゲットを導出します。</p>
          <div className="option-list">
            {diagnosisOptions.map((option) => (
              <button
                key={option.label}
                className={selectedAction === option.label ? 'option active' : 'option'}
                onClick={selectDiagnosis}
              >
                <span>{option.label}</span><small>{option.detail}</small>
              </button>
            ))}
          </div>
          {selectedAction && (
            <div className="result-card" aria-live="polite">
              <span>症状タグ: 疼痛</span>
              <strong>推奨ターゲット: アスピリン</strong>
            </div>
          )}
        </article>

        <article className="panel lab-panel">
          <div className="section-heading">
            <div className="icon-box"><Microscope size={22} /></div>
            <div><p className="eyebrow">UC-03</p><h3>反応制御</h3></div>
          </div>
          <div className="control-grid">
            <label>
              <span><Gauge size={16} /> 温度（℃）</span>
              <input type="range" min="40" max="100" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} />
              <strong>{temperature}℃</strong>
            </label>
            <label>
              <span><Beaker size={16} /> 触媒滴数</span>
              <input type="number" min="0" max="2" value={catalystDrops} onChange={(event) => setCatalystDrops(Math.min(2, Math.max(0, Number(event.target.value))))} />
            </label>
            <label>
              <span><Microscope size={16} /> 設備Tier</span>
              <select value={equipmentTier} onChange={(event) => setEquipmentTier(Number(event.target.value))}>
                <option value="1">Tier 1</option><option value="2">Tier 2</option><option value="3">Tier 3</option>
              </select>
            </label>
          </div>
          <div className="purity-card">
            <div><p>生成物純度</p><strong>{result.purityPercentage}%</strong></div>
            <div><p>未反応率</p><strong>{result.unreactedPercentage}%</strong></div>
            <div><p>有害不純物</p><strong>{result.hasToxicImpurities ? '検出' : 'なし'}</strong></div>
          </div>
        </article>
      </section>

      <footer>
        <p>要求追跡: REQ-CHEM-01〜04 / REQ-TALK-01 / NFR-REPR-01</p>
        <p>フロントエンドのみで動作</p>
      </footer>
    </main>
  )
}

export default App
