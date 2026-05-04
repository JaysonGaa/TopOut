import { useEffect, useRef, useState } from 'react'
import { detectHolds } from '../api'

const HOLD_COLORS = {
  yellow: '#f5c518',
  blue: '#1e90ff',
  red: '#ff4d00',
  green: '#00cc66',
  purple: '#9b59b6',
  pink: '#ff69b4',
  white: '#ffffff',
  black: '#555555',
}

function HoldVisualizer({ image, color = 'red', onHoldsDetected }) {
  const canvasRef = useRef(null)
  const [holds, setHolds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!image) return
    let cancelled = false
    const run = async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      setError(null)
      try {
        const detected = await detectHolds(image, { color })
        if (!cancelled) setHolds(detected)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Detection failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [image])

  useEffect(() => {
    if (!holds.length || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      holds.forEach((hold) => {
        const x = hold.x * img.width
        const y = hold.y * img.height
        const color = HOLD_COLORS[hold.color]
        ctx.beginPath()
        ctx.arc(x, y, 18, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.fillStyle = color + '33'
        ctx.fill()
      })
    }
    img.src = image
  }, [holds, image])

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>
        Holds Detected
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {error
          ? error
          : loading
            ? 'Scanning your wall for holds...'
            : `Found ${holds.length} holds. Review them below.`}
      </p>

      {loading ? (
        <div style={{ padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid var(--border)',
            borderTop: '3px solid var(--accent)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem'
          }} />
          <p>Analyzing holds...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : error ? (
        <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Check that the Flask API is running (<code>python app.py</code> in <code>backend</code>, port 5000) and try uploading again.
        </p>
      ) : (
        <>
          <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 8, display: 'block' }} />

          {/* Color legend */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
            {[...new Set(holds.map(h => h.color))].map((color) => (
              <div key={color} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: HOLD_COLORS[color] ?? '#888' }} />
                {color}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-primary" disabled={!holds.length} onClick={() => onHoldsDetected(holds)}>
              Edit Holds →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default HoldVisualizer
