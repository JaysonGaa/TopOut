import { useState } from 'react'
import ImageUpload from './components/ImageUpload'
import HoldVisualizer from './components/HoldVisualizer'
import HoldEditor from './components/HoldEditor'
import ClimberAnimation from './components/ClimberAnimation'
import './App.css'

function App() {
  const [stage, setStage] = useState('upload')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [holds, setHolds] = useState([])

  const handleReset = () => {
    setStage('upload')
    setUploadedImage(null)
    setHolds([])
  }

  const handleImageUpload = (imageData) => {
    setUploadedImage(imageData)
    setStage('visualize')
  }

  const handleHoldsDetected = (detectedHolds) => {
    setHolds(detectedHolds)
    setStage('edit')
  }

  const handleRouteConfirmed = (editedHolds) => {
    setHolds(editedHolds)
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
            onReset={handleReset}
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
