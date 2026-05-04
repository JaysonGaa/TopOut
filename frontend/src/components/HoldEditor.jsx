import { useRef, useState } from 'react'

const STATE_STYLE = {
  start:    { border: '#00cc66', bg: 'rgba(0,204,102,0.35)',            label: 'S' },
  end:      { border: '#ffaa00', bg: 'rgba(255,170,0,0.35)',            label: 'E' },
  excluded: { border: '#ff4444', bg: 'rgba(255,68,68,0.2)',             label: '×' },
  normal:   { border: 'rgba(255,255,255,0.85)', bg: 'rgba(0,0,0,0.25)', label: '' },
  added:    { border: '#c084fc', bg: 'rgba(192,132,252,0.3)',           label: '+' },
}

function holdSize(r) {
  return Math.round(22 + Math.min(((r ?? 0.02) / 0.02) * 16, 36))
}

let _nextId = -1
function newHoldId() { return _nextId-- }

function HoldEditor({ image, holds: initialHolds, onConfirm }) {
  const [mode, setMode] = useState('toggle')
  const [holds, setHolds] = useState(initialHolds)
  const [excluded, setExcluded] = useState(new Set())
  const [startIds, setStartIds] = useState([])
  const [endId, setEndId] = useState(null)
  const [startCount, setStartCount] = useState(1)
  const imgContainerRef = useRef(null)

  const getState = (h) => {
    if (startIds.includes(h.id)) return 'start'
    if (h.id === endId) return 'end'
    if (excluded.has(h.id)) return 'excluded'
    if (h.id < 0) return 'added'
    return 'normal'
  }

  const handleHoldClick = (e, h) => {
    if (mode === 'place') {
      // In place mode clicks on existing holds do nothing
      e.stopPropagation()
      return
    }
    e.stopPropagation()
    if (mode === 'toggle') {
      setExcluded(prev => {
        const next = new Set(prev)
        if (next.has(h.id)) {
          next.delete(h.id)
        } else {
          next.add(h.id)
          setStartIds(s => s.filter(id => id !== h.id))
          if (endId === h.id) setEndId(null)
        }
        return next
      })
    } else if (mode === 'start') {
      setExcluded(prev => { const n = new Set(prev); n.delete(h.id); return n })
      setStartIds(prev => {
        if (prev.includes(h.id)) return prev.filter(id => id !== h.id)
        const next = [...prev, h.id]
        return next.length > startCount ? next.slice(-startCount) : next
      })
    } else if (mode === 'end') {
      setExcluded(prev => { const n = new Set(prev); n.delete(h.id); return n })
      setEndId(prev => (prev === h.id ? null : h.id))
    }
  }

  const handleImageClick = (e) => {
    if (mode !== 'place') return
    const rect = imgContainerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const newHold = { id: newHoldId(), x, y, r: 0.03, color: 'custom', size: 20 }
    setHolds(prev => [...prev, newHold])
  }

  const handleConfirm = () => {
    const active = holds.filter(h => !excluded.has(h.id))
    onConfirm(active.length ? active : holds, startIds.length ? startIds : null, endId)
  }

  const activeCount = holds.length - excluded.size
  const previewUrl = typeof image === 'string' ? image : ''

  const MODES = [
    { key: 'toggle', label: 'Remove / Restore' },
    { key: 'place',  label: '+ Add Hold'        },
    { key: 'start',  label: 'Set Start'         },
    { key: 'end',    label: 'Set Finish'        },
  ]

  return (
    <div className="card" style={{ width: '100%', maxWidth: 640 }}>
      <h2 style={{ marginTop: 0, fontSize: '1.25rem', color: 'var(--text-h)' }}>Edit Route</h2>

      {/* Mode toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: 6,
              border: `1.5px solid ${mode === key ? 'var(--accent)' : 'var(--border)'}`,
              background: mode === key ? 'var(--accent-bg)' : 'transparent',
              color: mode === key ? 'var(--accent)' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: mode === key ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}

        {mode === 'start' && (
          <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '0.5rem' }}>
            {[1, 2].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setStartCount(n)
                  if (startIds.length > n) setStartIds(s => s.slice(-n))
                }}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: 6,
                  border: `1.5px solid ${startCount === n ? '#00cc66' : 'var(--border)'}`,
                  background: startCount === n ? 'rgba(0,204,102,0.15)' : 'transparent',
                  color: startCount === n ? '#00cc66' : 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                {n} hold{n > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hint */}
      <p style={{ margin: '0 0 0.75rem', color: 'var(--text)', fontSize: '0.85rem' }}>
        {mode === 'toggle' && 'Tap a hold to remove it from the route. Tap again to restore it.'}
        {mode === 'place'  && 'Tap anywhere on the wall to add a new hold (purple).'}
        {mode === 'start'  && `Tap up to ${startCount} hold${startCount > 1 ? 's' : ''} to mark the start position (green).`}
        {mode === 'end'    && 'Tap a hold to mark it as the finish (gold).'}
      </p>

      {/* Image + overlays */}
      <div
        ref={imgContainerRef}
        onClick={handleImageClick}
        style={{
          position: 'relative',
          borderRadius: 8,
          overflow: 'hidden',
          border: `1.5px solid ${mode === 'place' ? '#c084fc' : 'var(--border)'}`,
          lineHeight: 0,
          cursor: mode === 'place' ? 'crosshair' : 'default',
        }}
      >
        <img src={previewUrl} alt="" style={{ width: '100%', display: 'block', pointerEvents: 'none' }} />
        {holds.map(h => {
          const state = getState(h)
          const { border, bg, label } = STATE_STYLE[state]
          const sz = holdSize(h.r)
          return (
            <button
              key={h.id}
              type="button"
              title={`Hold ${h.id}`}
              onClick={(e) => handleHoldClick(e, h)}
              style={{
                position: 'absolute',
                left: `${h.x * 100}%`,
                top: `${h.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: sz,
                height: sz,
                minWidth: 22,
                minHeight: 22,
                borderRadius: '50%',
                border: `3px solid ${border}`,
                background: bg,
                cursor: mode === 'place' ? 'crosshair' : 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: border,
                lineHeight: 1,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span><span style={{ color: '#00cc66' }}>●</span> Start</span>
        <span><span style={{ color: '#ffaa00' }}>●</span> Finish</span>
        <span><span style={{ color: '#ff4444' }}>●</span> Removed</span>
        <span><span style={{ color: '#c084fc' }}>●</span> Added</span>
        <span><span style={{ color: 'rgba(200,200,200,0.9)' }}>●</span> In route</span>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {activeCount} hold{activeCount !== 1 ? 's' : ''} in route
          {startIds.length > 0 && ` · ${startIds.length} start`}
          {endId != null && ' · finish set'}
        </span>
        <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={activeCount === 0}>
          Confirm route →
        </button>
      </div>
    </div>
  )
}

export default HoldEditor
