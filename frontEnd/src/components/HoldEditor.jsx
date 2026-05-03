import { useState } from 'react'

function HoldEditor({ image, holds, onConfirm }) {
  const [flags, setFlags] = useState(() => holds.map(() => false))

  const toggle = (i) => {
    setFlags((prev) => {
      const next = [...prev]
      next[i] = !next[i]
      return next
    })
  }

  const handleConfirm = () => {
    const selected = holds.filter((_, i) => flags[i])
    onConfirm(selected.length ? selected : holds)
  }

  const previewUrl = typeof image === 'string' ? image : ''

  return (
    <div className="card" style={{ width: '100%', maxWidth: 640 }}>
      <h2 style={{ marginTop: 0, fontSize: '1.25rem', color: 'var(--text-h)' }}>Edit route</h2>
      <p style={{ margin: '0 0 1rem', color: 'var(--text)', fontSize: '0.95rem' }}>
        Tap holds to include them in the sequence (yellow). Confirm with none selected keeps all holds.
      </p>
      <div
        style={{
          position: 'relative',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          lineHeight: 0,
        }}
      >
        <img src={previewUrl} alt="" style={{ width: '100%', display: 'block' }} />
        {holds.map((h, i) => (
          <button
            key={h.id ?? i}
            type="button"
            title={`Hold ${i + 1}`}
            onClick={() => toggle(i)}
            style={{
              position: 'absolute',
              left: `${h.x * 100}%`,
              top: `${h.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: `${Math.round(22 + Math.min(((h.r ?? 0.02) / 0.02) * 16, 36))}px`,
              height: `${Math.round(22 + Math.min(((h.r ?? 0.02) / 0.02) * 16, 36))}px`,
              minWidth: 22,
              minHeight: 22,
              borderRadius: '50%',
              border: `3px solid ${flags[i] ? 'var(--accent, #aa3bff)' : 'rgba(255,255,255,0.85)'}`,
              background: flags[i] ? 'rgba(192,132,252,0.35)' : 'rgba(0,0,0,0.25)',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={handleConfirm}>
          Confirm route →
        </button>
      </div>
    </div>
  )
}

export default HoldEditor
