import { useState, useRef } from 'react'

const COLORS = [
  { key: 'red',    hex: '#ff4d00' },
  { key: 'blue',   hex: '#1e90ff' },
  { key: 'yellow', hex: '#f5c518' },
  { key: 'green',  hex: '#00cc66' },
  { key: 'purple', hex: '#9b59b6' },
  { key: 'pink',   hex: '#ff69b4' },
  { key: 'white',  hex: '#e5e5e5' },
  { key: 'black',  hex: '#444444' },
]

function ImageUpload({ onImageUpload }) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const [color, setColor] = useState('red')
  const fileInputRef = useRef(null)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>
        Upload Your Wall
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Take a photo of the climbing wall and we'll map out the best route for you.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !preview && fileInputRef.current.click()}
        style={{
          border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--surface3)'}`,
          borderRadius: '8px',
          padding: preview ? '0' : '4rem 2rem',
          cursor: preview ? 'default' : 'pointer',
          background: isDragging ? 'rgba(29,185,84,0.05)' : 'var(--surface2)',
          overflow: 'hidden',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        {preview ? (
          <img src={preview} alt="Wall preview" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} />
        ) : (
          <div>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🧗</div>
            <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.4rem' }}>
              Drop a wall photo here ↓
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              or <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>click to upload</span>
            </p>
            <p style={{ color: 'var(--text-faint)', fontSize: '0.75rem', marginTop: '0.75rem' }}>
              JPG, PNG, and HEIC supported
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files[0])}
        style={{ display: 'none' }}
      />

      {preview && (
        <>
          {/* Color picker */}
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              What color are the holds?
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {COLORS.map(({ key, hex }) => (
                <button
                  key={key}
                  type="button"
                  title={key}
                  onClick={() => setColor(key)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: hex,
                    border: `3px solid ${color === key ? 'var(--accent)' : 'transparent'}`,
                    outline: color === key ? '2px solid var(--accent)' : '2px solid transparent',
                    outlineOffset: 2,
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'outline 0.1s',
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '0.5rem', fontWeight: 600 }}>
              {color}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.25rem' }}>
            <button className="btn btn-secondary" onClick={() => { setPreview(null); fileInputRef.current.click() }}>
              Change Photo
            </button>
            <button className="btn btn-primary" onClick={() => onImageUpload(preview, color)}>
              Analyze Route
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ImageUpload
