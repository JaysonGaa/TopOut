import { useState } from 'react'
import ImageUpload from './components/ImageUpload'
import HoldVisualizer from './components/HoldVisualizer'
import HoldEditor from './components/HoldEditor'
import ClimberAnimation from './components/ClimberAnimation'
import './App.css'

function App() {
  const [stage, setStage] = useState('upload')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [selectedColor, setSelectedColor] = useState('red')
  const [holds, setHolds] = useState([])
  const [startIds, setStartIds] = useState(null)
  const [endId, setEndId] = useState(null)

  const handleReset = () => {
    setStage('upload')
    setUploadedImage(null)
    setSelectedColor('red')
    setHolds([])
    setStartIds(null)
    setEndId(null)
  }

  const handleImageUpload = (imageData, color) => {
    setUploadedImage(imageData)
    setSelectedColor(color)
    setStage('visualize')
  }

  const handleHoldsDetected = (detectedHolds) => {
    setHolds(detectedHolds)
    setStage('edit')
  }

  const handleRouteConfirmed = (editedHolds, newStartIds, newEndId) => {
    setHolds(editedHolds)
    setStartIds(newStartIds)
    setEndId(newEndId)
    setStage('animate')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="logo">TOP<span>OUT</span></h1>
        <p className="tagline">AI-powered bouldering route advisor</p>
      </header>

      <main className="app-main">
        {stage === 'upload' && (
          <ImageUpload onImageUpload={handleImageUpload} />
        )}
        {stage === 'visualize' && (
          <HoldVisualizer
            image={uploadedImage}
            color={selectedColor}
            onHoldsDetected={handleHoldsDetected}
          />
        )}
        {stage === 'edit' && (
          <HoldEditor
            image={uploadedImage}
            holds={holds}
            onConfirm={handleRouteConfirmed}
          />
        )}
        {stage === 'animate' && (
          <ClimberAnimation
            image={uploadedImage}
            holds={holds}
            startIds={startIds}
            endId={endId}
            onReset={handleReset}
            imageForRoute={uploadedImage}
          />
        )}
      </main>

      <nav className="stage-nav">
        {['upload', 'visualize', 'edit', 'animate'].map((s, i) => (
          <div key={s} className={`stage-dot ${stage === s ? 'active' : ''} ${
            ['upload', 'visualize', 'edit', 'animate'].indexOf(stage) > i ? 'done' : ''
          }`} />
        ))}
      </nav>
    </div>
  )
}

export default App
