import { useState, useRef } from 'react'

function ImageUpload({ onImageUpload }) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState(null)
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
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={() => { setPreview(null); fileInputRef.current.click() }}>
            Change Photo
          </button>
          <button className="btn btn-primary" onClick={() => onImageUpload(preview)}>
            Analyze Route
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageUpload