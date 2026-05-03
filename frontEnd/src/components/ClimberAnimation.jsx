import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const generateRoute = (holds) => [...holds].sort((a, b) => b.y - a.y)

const drawStickFigure = (ctx, x, y, scale = 1, alpha = 1) => {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5 * scale
  ctx.lineCap = 'round'
  const s = 18 * scale
  ctx.beginPath(); ctx.arc(x, y - s * 2.2, s * 0.7, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x, y - s * 1.5); ctx.lineTo(x, y + s * 0.5); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - s, y - s * 0.8); ctx.lineTo(x, y - s * 1.2); ctx.lineTo(x + s, y - s * 0.8); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.5); ctx.lineTo(x - s * 0.8, y + s * 1.8); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.5); ctx.lineTo(x + s * 0.8, y + s * 1.8); ctx.stroke()
  ctx.restore()
}

function ClimberAnimation({ image, holds, onReset }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const imgRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const route = useMemo(() => generateRoute(Array.isArray(holds) ? holds : []), [holds])

  const drawFrame = useCallback((t) => {
    const canvas = canvasRef.current
    if (!canvas || !imgRef.current) return
    const ctx = canvas.getContext('2d')
    const img = imgRef.current
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    holds.forEach((hold) => {
      ctx.beginPath(); ctx.arc(hold.x * img.width, hold.y * img.height, 16, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke()
    })

    if (route.length > 1) {
      ctx.beginPath(); ctx.setLineDash([6, 8])
      ctx.strokeStyle = 'rgba(255,170,0,0.5)'; ctx.lineWidth = 2
      ctx.moveTo(route[0].x * img.width, route[0].y * img.height)
      route.forEach(h => ctx.lineTo(h.x * img.width, h.y * img.height))
      ctx.stroke(); ctx.setLineDash([])
    }

    const visitedCount = Math.floor(t * route.length)
    for (let i = 0; i <= visitedCount && i < route.length; i++) {
      const hx = route[i].x * img.width; const hy = route[i].y * img.height
      ctx.beginPath(); ctx.arc(hx, hy, 18, 0, Math.PI * 2)
      ctx.fillStyle = i === visitedCount ? 'rgba(255,170,0,0.4)' : 'rgba(0,204,102,0.3)'; ctx.fill()
      ctx.strokeStyle = i === visitedCount ? '#ffaa00' : '#00cc66'; ctx.lineWidth = 2.5; ctx.stroke()
    }

    if (route.length >= 2) {
      const seg = Math.min(t * (route.length - 1), route.length - 1.001)
      const segIndex = Math.floor(seg); const segT = seg - segIndex
      const from = route[segIndex]; const to = route[Math.min(segIndex + 1, route.length - 1)]
      const mx = from.x * img.width + (to.x * img.width - from.x * img.width) * segT
      const my = from.y * img.height + (to.y * img.height - from.y * img.height) * segT - Math.sin(segT * Math.PI) * 30
      drawStickFigure(ctx, from.x * img.width, from.y * img.height, 1, 0.2)
      drawStickFigure(ctx, mx, my, 1)
    }
  }, [holds, route])

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      drawFrame(0)
    }
    img.src = image
  }, [image, drawFrame])

  const animate = () => {
    let start = null
    const duration = route.length * 900
    const step = (timestamp) => {
      if (!start) start = timestamp
      const t = Math.min((timestamp - start) / duration, 1)
      drawFrame(t); setProgress(t)
      if (t < 1) { animRef.current = requestAnimationFrame(step) }
      else { setPlaying(false) }
    }
    animRef.current = requestAnimationFrame(step)
  }

  const handlePlay = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    drawFrame(0); setProgress(0); setPlaying(true); animate()
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Your Route</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{route.length} holds · Watch the recommended path</p>

      <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 8, display: 'block' }} />

      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: '1rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'var(--accent)', width: `${progress * 100}%`, transition: 'width 0.1s linear', borderRadius: 2 }} />
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.25rem' }}>
        <button className="btn btn-secondary" onClick={onReset}>↩ Start Over</button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={playing}
          onClick={handlePlay}
        >
          ▶ {progress >= 1 ? 'Replay' : progress > 0 ? 'Playing…' : 'Play Route'}
        </button>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {route.map((hold, i) => (
          <div key={hold.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{i + 1}</span> {hold.type} · {hold.difficulty}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ClimberAnimation