# TopOut 

**AI-Powered Climbing Beta Generator**

*Built at BeaverHacks 2026 | Oregon State University*

<img width="1868" alt="TopOut Demo - Hold Detection" src="https://github.com/user-attachments/assets/815cb9b4-7897-465f-a7d4-e6d6ca1a7684" />

---

## Hackathon Track

**NVIDIA Nemotron Track** — Best Use of Nemotron for Agentic AI

TopOut demonstrates multi-agent AI orchestration using NVIDIA's Nemotron vision model for intelligent climbing hold detection, validation, and route planning.

---

## What is TopOut?

TopOut helps climbers visualize and plan their routes. Upload a photo of a climbing wall and the system:

1. **Detects climbing holds** using OpenCV color detection + NVIDIA Nemotron validation
2. **Removes false positives** — AI filters out wall texture, chalk marks, and shadows
3. **Lets you edit the route** — add or remove holds, mark 1–2 start holds and an end hold
4. **Generates optimal beta** — AI selects an efficient subset of holds and plans the sequence
5. **Animates the climb** — step-by-step canvas animation showing which hand and foot goes where

---

## Demo

<img width="1858" alt="Multi-color hold detection" src="https://github.com/user-attachments/assets/bc54a4f2-c5e0-4050-98b7-b45e051ea89a" />

### Hold Detection
Upload a photo, choose the hold color, and the system detects every hold on the wall.

---

<img width="1841" alt="Route visualization" src="https://github.com/user-attachments/assets/29383cc2-8803-4952-847c-e5d1395c9e6f" />

### Hold Editor
Review detected holds. Add missed holds (chalk-covered holds are often missed), remove false positives, and mark your start and finish holds.

### Animated Beta
Watch a step-by-step animation of the suggested route. Each limb is color-coded:

| Color | Limb |
|-------|------|
| 🔵 Blue | Right Hand (RH) |
| 🟣 Purple | Left Hand (LH) |
| 🟠 Orange | Right Foot (RF) |
| 🟡 Yellow | Left Foot (LF) |

Controls: **Play**, **Stop**, **← Prev**, **Next →**, and click any move dot to jump directly to that step.

---

## Tech Stack

### Backend
- **Python 3.13** + **Flask** — REST API
- **OpenCV** — HSV color masking for hold candidate detection
- **NVIDIA Nemotron** (`meta/llama-3.2-90b-vision-instruct` via NIM) — hold validation and route planning
- **NumPy** — image processing

### Frontend
- **React + Vite** — UI
- **HTML Canvas** — animated route visualization with `requestAnimationFrame`

---

## How It Works

### Multi-Agent Pipeline

**Agent 1 — Hold Detection**
OpenCV performs HSV color-range masking to find candidate hold blobs. Each blob is assigned a normalized (0–1) x/y coordinate and a size-based radius.

**Agent 2 — Hold Validation**
The candidate image (annotated with numbered circles) is sent to Nemotron. The model examines each numbered circle and returns only the IDs that are real physical holds, filtering out wall texture, tape, and shadows.

**Agent 3 — Route Planning**
When `NVIDIA_API_KEY` is set, Nemotron receives the annotated wall image and selects an efficient *subset* of holds with an ordered sequence and a foot-start recommendation (`smear` vs. stepping on actual holds). Without an API key, a nearest-neighbor + 2-opt algorithm generates the sequence.

**Agent 4 — Limb Assignment**
A deterministic climbing-logic algorithm assigns the correct limb to each hold:
- Right-side holds (x > 0.5) → `right_hand`, with `right_foot` following
- Left-side holds (x ≤ 0.5) → `left_hand`, with `left_foot` following
- Feet step to where the same-side hand just was, keeping them always in a realistic position below the hands

---

## Installation

### Prerequisites
- Python 3.8+
- Node.js 18+
- NVIDIA API Key (optional — get one at [build.nvidia.com](https://build.nvidia.com))

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Mac / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Add your NVIDIA API key (optional — OpenCV fallback works without it)
echo "NVIDIA_API_KEY=your_key_here" > .env

# Start the server
python app.py
```

Backend runs on `http://localhost:5000`

### Frontend

```bash
cd frontend

npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## API Reference

<img width="1854" alt="Detection testing" src="https://github.com/user-attachments/assets/8a492a84-849a-486c-abad-eb4676398173" />

### `GET /api/health`

```json
{ "status": "ok", "nemotron": true }
```

---

### `POST /api/detect-holds`

Detect and validate holds in an image.

**Request**
```json
{
  "image": "<base64-encoded image, no data URI prefix>",
  "color": "red"
}
```

Supported colors: `red`, `blue`, `yellow`, `green`, `purple`, `pink`, `white`, `black`

**Response**
```json
{
  "holds": [
    { "id": 1, "x": 0.42, "y": 0.81, "r": 0.028, "size": 38, "color": "red" },
    { "id": 2, "x": 0.55, "y": 0.67, "r": 0.031, "size": 42, "color": "red" }
  ],
  "image_info": { "width": 1360, "height": 1020 },
  "detection_method": "opencv+nemotron"
}
```

All `x`, `y`, `r` values are normalized to 0–1. `detection_method` is `"opencv"` or `"opencv+nemotron"`.

---

<img width="1836" alt="Route generation output" src="https://github.com/user-attachments/assets/e936b649-a848-4932-a195-f612558ede0a" />

### `POST /api/generate-route`

Generate a climbing route from a set of holds.

**Request**
```json
{
  "holds": [ { "id": 1, "x": 0.42, "y": 0.81, "r": 0.028 }, "..." ],
  "start_hold_ids": [1, 2],
  "end_hold_id": 18,
  "image": "<base64-encoded image, optional — enables Nemotron route planning>"
}
```

**Response**
```json
{
  "route": [
    { "id": "right_foot_setup", "x": 0.46, "y": 0.95, "limb": "right_foot", "difficulty": "setup", "type": "foothold", "move_number": 1 },
    { "id": "left_foot_setup",  "x": 0.54, "y": 0.95, "limb": "left_foot",  "difficulty": "setup", "type": "foothold", "move_number": 2 },
    { "id": 1, "x": 0.42, "y": 0.81, "limb": "right_hand", "difficulty": "start",    "type": "jug",    "move_number": 3 },
    { "id": 2, "x": 0.55, "y": 0.67, "limb": "left_hand",  "difficulty": "start",    "type": "sloper", "move_number": 4 },
    { "id": 7, "x": 0.61, "y": 0.52, "limb": "right_hand", "difficulty": "moderate", "type": "jug",    "move_number": 5 }
  ],
  "method": "nemotron+cog"
}
```

`method` is `"algorithm"` or `"nemotron+cog"`. `difficulty` is one of `setup`, `start`, `easy`, `moderate`, `hard`, `top`. `type` is `crimp`, `sloper`, or `jug`.

---

## Features

- **AI Hold Detection** — Nemotron vision model integration
- **OpenCV Fallback** — fully functional without an API key
- **Multi-color Support** — red, blue, yellow, green, purple, pink, white, black
- **False Positive Filtering** — AI removes wall texture, tape, chalk marks, and shadows
- **Hold Editor** — add missed holds, remove false positives, select 1–2 start holds and an end hold
- **Nemotron Route Planning** — AI selects an efficient hold subset and orders moves with center-of-gravity awareness
- **Dual-start Support** — routes can begin from one or two starting holds
- **Foot Start Logic** — AI decides between smearing on the wall vs. stepping on actual footholds
- **Step-by-step Animation** — canvas animation with easeInOut motion and arc lift on the moving limb
- **Playback Controls** — Play, Stop, Prev, Next, and click-to-jump progress dots
- **Limb Legend** — color-coded RH / LH / RF / LF indicators with glow on the active limb

---

## Results

Test image (1360×1020px climbing wall):
- OpenCV candidates: **81 blobs**
- After Nemotron validation: **41 confirmed holds** (~50% false positive reduction)
- Route length: **10–14 moves** depending on start/end selection
- Processing time: ~0.08s (OpenCV) + ~2.5s (Nemotron) = **~3s total**

---

## What Went Wrong

### Beta Path Generation — Not Working

The core feature of the app — showing a realistic, step-by-step climbing route with correct hand and foot placement — **does not work correctly**. The animation plays and the UI is functional, but the actual beta is unreliable. This was the hardest problem we ran into and we ran out of time to solve it properly.

**The specific failures:**

**1. Limb assignment is wrong**
The algorithm assigns limbs based on a hold's horizontal position (right side = right hand/foot, left side = left hand/foot). In practice this breaks down quickly — routes don't go straight up one side of a wall, and the simple left/right split produces nonsensical moves like a foot teleporting across the wall or a hand being assigned to a hold that's clearly a foothold.

**2. The route path makes no physical sense**
Even when the hold *order* is roughly correct (bottom to top), the combination of hold sequence + limb assignment often produces positions a human body cannot physically achieve. For example: both feet stuck at the bottom of the wall while hands are near the top, or a foot assigned to a hold that's higher than the hands. We iterated on this many times but never found an approach that worked consistently.

**3. Nemotron can't reliably do spatial left/right reasoning**
We tried asking Nemotron to assign specific limbs (`right_hand`, `left_foot`, etc.) per hold. The model is good at identifying holds and ordering them by difficulty or proximity, but it consistently gets left/right wrong — it doesn't have reliable spatial awareness of "this hold is on the left side of the wall so use the left hand." We ended up moving limb assignment back to a rule-based algorithm, which also doesn't work well.

**4. No understanding of body mechanics**
Real climbing beta requires knowing where the climber's center of gravity is at every step. Our system has no concept of body position — it just picks holds and assigns limbs without checking whether the resulting position is stable, reachable from the previous position, or physically possible given the climber's proportions. A proper solution would need a body simulation or training data from real climbers.

**Root cause:** We underestimated how hard this problem is. Generating valid climbing beta is essentially an inverse kinematics + physics problem. It's not something that can be solved in a few hours with a greedy algorithm and some heuristics.

---

## What We Didn't Finish

- **Working beta / limb assignment** — the animation plays but the moves are not reliable
- **Hold type classification** — all holds are treated equally; we don't distinguish jugs (meant for hands) from footholds, crimps, or slopers. This is a major input to correct limb assignment
- **Route difficulty scoring** — no V-grade estimate or crux identification
- **Natural language beta descriptions** — "match on the right hand jug, then reach left to the sloper at 2 o'clock"
- **Validation that a route is physically possible** — no check that consecutive holds are within reach, or that the resulting body position is stable
- **Mobile layout** — the UI works on desktop but isn't optimized for phones, which is how most climbers would actually use this at the gym

---

## If We Had More Time

1. **Real hold type classification** — the current code labels holds as `crimp`, `sloper`, or `jug` based purely on detected blob size (small = crimp, large = jug). This is meaningless — hold type is determined by shape, texture, and angle, none of which our system reads. A proper implementation would ask Nemotron to visually classify each hold and use that to constrain limb assignment (footholds → feet only, jugs → hands preferred).
2. **Body state simulation** — track hip position and shoulder position after every move and reject any move that puts the body in an impossible or unstable configuration.
3. **A\* pathfinding over body states** — instead of picking holds greedily, search for the sequence of body states (all 4 limb positions) with the lowest total difficulty score.
4. **Train on real beta** — collect video of climbers and label which hold each limb goes to. Use that as training data or few-shot examples for Nemotron.
5. **Let the user correct the beta** — if the AI gets a move wrong, let the climber tap the hold and drag it to the correct limb. Build a feedback loop.

---

## Team

- Jayson Gaa
- Huy Tran
- Aimee Wong

*Built in 24 hours at BeaverHacks 2026*

---

## Acknowledgments

- **BeaverHacks** — for organizing an amazing hackathon
- **NVIDIA** — for providing Nemotron API access and the NIM platform
- **Oregon State University** — for hosting the event
- **Claude AI** — for pair programming assistance

---

## Links

- **Hackathon**: [BeaverHacks 2026](https://beaverhacks.org)
- **NVIDIA NIM**: [build.nvidia.com](https://build.nvidia.com)

---

## License

MIT License — built for educational purposes at BeaverHacks 2026
