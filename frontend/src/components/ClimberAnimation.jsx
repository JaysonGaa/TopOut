import { useCallback, useEffect, useRef, useState } from 'react'
import { requestServerRoute } from '../api'

const LIMB_COLOR = {
  right_hand: '#4fc3f7',
  left_hand:  '#ab47bc',
  right_foot: '#ff8a65',
  left_foot:  '#ffca28',
}

const STEP_MS = 700

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

// One limb state per move (index 0 = before any moves)
function buildStates(route, imgW, imgH) {
  if (!route.length) return []

  // Find the first hand start hold to anchor the initial body position
  const firstHandMove = route.find(m => m.difficulty === 'start' && m.limb?.includes('hand'))
                     || route.find(m => m.limb?.includes('hand'))
                     || route[0]

  const anchorX = firstHandMove.x * imgW
  const anchorY = firstHandMove.y * imgH
  const spread  = imgW * 0.07
  const legDrop = imgH * 0.25

  // All limbs start clustered at the base — the first 4 route moves
  // (right_foot setup, left_foot setup, right_hand start, left_hand start)
  // will bring each limb to its proper wall position.
  const groundY = Math.min(imgH * 0.97, anchorY + legDrop)
  const initial = {
    right_hand: { x: anchorX - spread * 0.5, y: Math.min(imgH * 0.97, anchorY + legDrop * 0.4) },
    left_hand:  { x: anchorX + spread * 0.5, y: Math.min(imgH * 0.97, anchorY + legDrop * 0.4) },
    right_foot: { x: anchorX - spread * 0.6, y: groundY },
    left_foot:  { x: anchorX + spread * 0.6, y: groundY },
  }

  const states = [initial]
  let cur = { ...initial }
  for (const move of route) {
    cur = { ...cur, [move.limb]: { x: move.x * imgW, y: move.y * imgH } }
    states.push({ ...cur })
  }
  return states
}

function drawFigure(ctx, limbs, activeLimb, imgH) {
  const { right_hand: rh, left_hand: lh, right_foot: rf, left_foot: lf } = limbs

  const unit = imgH * 0.045

  // Shoulder tracks hands center, hip tracks feet center.
  // This keeps arm/leg lines short regardless of how far apart holds are.
  const handsMidX = (rh.x + lh.x) / 2
  const handsMidY = (rh.y + lh.y) / 2
  const feetMidX  = (rf.x + lf.x) / 2
  const feetMidY  = (rf.y + lf.y) / 2

  const shoulder = { x: handsMidX, y: handsMidY + unit * 1.0 }
  const hip      = { x: feetMidX,  y: feetMidY  - unit * 0.8 }
  const headCy   = shoulder.y - unit * 1.4
  const headR    = Math.max(6, unit * 0.85)

  // Spine
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(hip.x, hip.y)
  ctx.lineTo(shoulder.x, shoulder.y)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()

  // Head
  ctx.save()
  ctx.beginPath()
  ctx.arc(shoulder.x, headCy, headR, 0, Math.PI * 2)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.restore()

  // Limbs — line from joint to hold, with dot at hold
  const drawLimb = (joint, holdPt, key) => {
    const active = key === activeLimb
    const color  = LIMB_COLOR[key]

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(joint.x, joint.y)
    ctx.lineTo(holdPt.x, holdPt.y)
    ctx.strokeStyle = active ? color : 'rgba(255,255,255,0.75)'
    ctx.lineWidth   = active ? 4 : 2.5
    ctx.lineCap     = 'round'
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.arc(holdPt.x, holdPt.y, active ? 8 : 5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
  }

  drawLimb(shoulder, rh, 'right_hand')
  drawLimb(shoulder, lh, 'left_hand')
  drawLimb(hip,      rf, 'right_foot')
  drawLimb(hip,      lf, 'left_foot')
}

function renderCanvas(ctx, img, holds, route, limbs, activeLimb, upToStep) {
  ctx.canvas.width  = img.width
  ctx.canvas.height = img.height
  ctx.drawImage(img, 0, 0)

  // Faint hold markers
  holds.forEach(h => {
    ctx.beginPath()
    ctx.arc(h.x * img.width, h.y * img.height, 13, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  })

  // Visited holds with move numbers
  for (let i = 0; i < upToStep && i < route.length; i++) {
    const h     = route[i]
    const color = LIMB_COLOR[h.limb] ?? '#fff'
    const px    = h.x * img.width
    const py    = h.y * img.height
    ctx.beginPath()
    ctx.arc(px, py, 15, 0, Math.PI * 2)
    ctx.fillStyle   = color + '33'
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth   = 2
    ctx.stroke()
    ctx.fillStyle      = '#fff'
    ctx.font           = 'bold 11px system-ui'
    ctx.textAlign      = 'center'
    ctx.textBaseline   = 'middle'
    ctx.fillText(String(i + 1), px, py)
  }

  // Pulse ring on current target
  if (activeLimb && upToStep > 0 && upToStep <= route.length) {
    const th = route[upToStep - 1]
    if (th) {
      const color = LIMB_COLOR[th.limb] ?? '#fff'
      ctx.beginPath()
      ctx.arc(th.x * img.width, th.y * img.height, 21, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth   = 2.5
      ctx.setLineDash([5, 5])
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  drawFigure(ctx, limbs, activeLimb, img.height)
}

// ─────────────────────────────────────────────────────────────────────────────

function ClimberAnimation({ image, holds, startIds, endId, onReset, imageForRoute }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const imgRef    = useRef(null)
  const statesRef = useRef([])

  const [route,   setRoute]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [playing, setPlaying] = useState(false)
  const [step,    setStep]    = useState(0)

  // Fetch route from backend
  useEffect(() => {
    requestServerRoute(holds, startIds, endId, imageForRoute)
      .then(r  => { setRoute(r);        setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild states once we have both image and route
  const init = useCallback(() => {
    const img = imgRef.current
    if (!img || !route.length) return
    statesRef.current = buildStates(route, img.width, img.height)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) renderCanvas(ctx, img, holds, route, statesRef.current[0], null, 0)
    setStep(0)
  }, [route, holds])

  useEffect(() => {
    const img = new Image()
    img.onload = () => { imgRef.current = img; init() }
    img.src = image
  }, [image, init])

  useEffect(() => { if (!loading) init() }, [loading, init])

  // Jump to a specific state index without animation
  const jumpTo = useCallback((idx) => {
    const states = statesRef.current
    const img    = imgRef.current
    const ctx    = canvasRef.current?.getContext('2d')
    if (!ctx || !img || !states[idx]) return
    const activeLimb = idx > 0 && idx <= route.length ? route[idx - 1].limb : null
    renderCanvas(ctx, img, holds, route, states[idx], activeLimb, idx)
    setStep(idx)
  }, [holds, route])

  // Animate step index → index+1 then recurse
  const animateStep = useCallback((idx) => {
    const states = statesRef.current
    const img    = imgRef.current
    const ctx    = canvasRef.current?.getContext('2d')
    if (!ctx || !img || idx >= states.length - 1) { setPlaying(false); return }

    const from       = states[idx]
    const to         = states[idx + 1]
    const activeLimb = idx < route.length ? route[idx].limb : null
    let start = null

    const tick = (ts) => {
      if (!start) start = ts
      const raw = Math.min((ts - start) / STEP_MS, 1)
      const t   = easeInOut(raw)

      // Lerp only the moving limb; other limbs stay at destination
      const limbs = { ...to }
      if (activeLimb) {
        const arc = Math.sin(raw * Math.PI) * -img.height * 0.035
        const pos = lerp(from[activeLimb], to[activeLimb], t)
        limbs[activeLimb] = { x: pos.x, y: pos.y + arc }
      }

      renderCanvas(ctx, img, holds, route, limbs, activeLimb, idx + 1)
      setStep(idx + 1)

      if (raw < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        animateStep(idx + 1)
      }
    }
    animRef.current = requestAnimationFrame(tick)
  }, [holds, route])

  const handlePlay = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    setPlaying(true)
    jumpTo(0)
    setTimeout(() => animateStep(0), 50)
  }

  const handleStop = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    setPlaying(false)
  }

  const handlePrev = () => { handleStop(); jumpTo(Math.max(0, step - 1)) }
  const handleNext = () => { handleStop(); jumpTo(Math.min(statesRef.current.length - 1, step + 1)) }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
      <p style={{ color: 'var(--text-muted)' }}>Generating route...</p>
    </div>
  )
  if (error) return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
      <p style={{ color: '#ff6b6b', marginBottom: '1rem' }}>{error}</p>
      <button className="btn btn-secondary" onClick={onReset}>Start Over</button>
    </div>
  )

  const currentMove  = step > 0 && step <= route.length ? route[step - 1] : null
  const totalStates  = statesRef.current.length

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'Bebas Neue, var(--heading)', fontSize: '2rem', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
        Your Route
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
        {route.length} moves · step through or watch it play
      </p>

      <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 8, display: 'block' }} />

      {/* Current move badge */}
      <div style={{ minHeight: 40, marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {currentMove ? (
          <>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Move {step} of {route.length}
            </span>
            <span style={{
              padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600,
              background: (LIMB_COLOR[currentMove.limb] ?? '#fff') + '22',
              color: LIMB_COLOR[currentMove.limb] ?? '#fff',
              border: `1px solid ${(LIMB_COLOR[currentMove.limb] ?? '#fff')}55`,
            }}>
              {currentMove.limb.replace('_', ' ')}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {currentMove.type} · {currentMove.difficulty}
            </span>
          </>
        ) : (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Starting position</span>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '0.5rem', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={handlePrev} disabled={step === 0 || playing}>← Prev</button>
        {playing
          ? <button className="btn btn-primary" onClick={handleStop}>⏹ Stop</button>
          : <button className="btn btn-primary" onClick={handlePlay}>
              ▶ {step >= totalStates - 1 ? 'Replay' : step > 0 ? 'Continue' : 'Play'}
            </button>
        }
        <button className="btn btn-secondary" onClick={handleNext} disabled={step >= totalStates - 1 || playing}>Next →</button>
      </div>

      {/* Progress dots — skip setup moves */}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {route.map((move, i) => move.difficulty === 'setup' ? null : (
          <button
            key={i}
            type="button"
            onClick={() => { if (!playing) jumpTo(i + 1) }}
            title={`Move ${i + 1}: ${move.limb.replace('_', ' ')}`}
            style={{
              width: 10, height: 10, borderRadius: '50%', padding: 0, border: 'none',
              background: step > i ? (LIMB_COLOR[move.limb] ?? '#fff') : 'var(--border)',
              cursor: playing ? 'default' : 'pointer',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>

      {/* Limb legend */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        {Object.entries(LIMB_COLOR).map(([limb, color]) => (
          <span key={limb}><span style={{ color }}>●</span> {limb.replace('_', ' ')}</span>
        ))}
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <button className="btn btn-secondary" onClick={onReset}>↩ Start Over</button>
      </div>
    </div>
  )
}

export default ClimberAnimation
