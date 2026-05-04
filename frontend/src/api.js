/** No trailing slash — avoids `//api/...` when VITE_API_URL ends with `/`. */
const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/+$/, '')

/**
 * Flask expects raw base64; browsers send `data:image/jpeg;base64,...`.
 */
function imagePayloadForServer(imageInput) {
  if (typeof imageInput !== 'string') return imageInput
  const comma = imageInput.indexOf(',')
  if (comma !== -1 && imageInput.slice(0, comma).includes('base64')) {
    return imageInput.slice(comma + 1)
  }
  return imageInput
}

/**
 * POST /api/detect-holds — returns holds with pixel x,y; we normalize to 0–1 for the UI.
 */
export async function detectHolds(imageDataUrl, options = {}) {
  const color = options.color ?? 'red'
  const response = await fetch(`${API_BASE}/api/detect-holds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imagePayloadForServer(imageDataUrl), color }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Hold detection failed (${response.status})`)
  }

  const holds = data.holds ?? []
  const imageInfo = data.image_info ?? {}
  const w = imageInfo.width || 1
  const h = imageInfo.height || 1
  const minDim = Math.min(w, h)

  return holds.map((hold) => ({
    ...hold,
    x: hold.x / w,
    y: hold.y / h,
    r: hold.size ? Math.min(0.12, (hold.size / minDim) * 0.9) : 0.02,
  }))
}

/**
 * When the backend adds `POST /api/generate-route`, call this.
 * (Name avoids clashing with the local `generateRoute` sort in `ClimberAnimation.jsx`.)
 */
export async function requestServerRoute(holds, startHoldIds = null, endHoldId = null, imageDataUrl = null) {
  const body = { holds, start_hold_ids: startHoldIds, end_hold_id: endHoldId }
  if (imageDataUrl) {
    body.image = imagePayloadForServer(imageDataUrl)
  }
  const response = await fetch(`${API_BASE}/api/generate-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Route generation failed (${response.status})`)
  }
  return data.route ?? []
}
