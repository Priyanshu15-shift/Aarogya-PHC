
# 🏥 Aarogya-PHC

**Real-time, multilingual, district-wide healthcare monitoring — epidemic forecasting, register digitization, and AI-driven resource redistribution for India's Primary Health Centres.**

Built for **Google's "Build with AI: Code for Communities"** hackathon — Smart Health track

</div>

---

## 📋 Problem Statement

Primary Health Centres (PHCs) and Community Health Centres (CHCs) face recurring operational gaps — medicine stock-outs, unmanaged patient footfall, bed unavailability, and unpredictable doctor attendance — tracked manually with no real-time visibility. This leads to preventable shortages and under-resourced facilities going unnoticed until it's too late.

**Aarogya-PHC** turns that reactive cycle into a proactive one: digitizing paper registers on the spot, forecasting disease spikes days in advance, and automatically flagging struggling facilities to district administrators before a crisis hits.

---

## ✨ Features

### 🖥️ Telemetry & Forecasts
- **District Command View** — every PHC/CHC in the district scored 0–100 on risk (stock, doctor attendance, beds, test kits) and auto-flagged **CRITICAL / WATCH / STABLE**, so administrators see what needs attention first, not facility-by-facility.
- **Facility Clinical View** — per-facility operations dashboard: doctor attendance, bed availability, test kit stock, and core drug inventory.
- **14-Day Epidemic Forecast Horizon** — trend-based forecasting per symptom (Fever, Diarrhea, Malaria, Rash), correlated against a 14-day rainfall/temperature history to project disease-spike risk with a horizon window (e.g., "10–14 days").
- **Gemini Reasoning Layer** — every forecast can be explained in one clear sentence by Gemini, grounded in the actual rainfall, symptom-trend, and staffing data behind the score — not a generic AI blurb.

### 📷 Photo Digitizer (OCR)
- Drag-and-drop (or sample) handwritten register photo → Gemini Multimodal OCR extracts patient logs into strict structured JSON (date, symptom, footfall count, drug dispensed, quantity).
- Reviewed extracted ledger before committing to the district database — no silent overwrites.

### 📦 Smart Resource Redistribution
- Detects stock deficiencies and finds verified surplus facilities within a configurable range (<500km), ranked by distance and surplus amount.
- Gemini drafts a formal government transfer order in the selected language.
- One-click **Approve & Execute** — updates both facilities' inventories in real time and logs the transfer to a verified ledger.

### 🗺️ India PHC Map (Epidemiological Google Map)
- Real Google Maps JavaScript API (via `@vis.gl/react-google-maps`) with a custom dark cartographic theme — genuine coastlines, roads, and administrative boundaries, not an abstract shape.
- State and district GeoJSON overlays for real drill-down zoom.
- Marker clustering at the national view; individual color-coded pins (risk-scored) once zoomed into a state.
- Click any facility pin for a live InfoWindow with full status and coordinates.

### 🌐 Multilingual (11 languages)
English, Hindi, Telugu, Marathi, Bengali, Kannada, Tamil, Malayalam, Gujarati, Punjabi, Odia — covering UI labels, symptom names, Gemini-generated explanations, and drafted transfer orders.

### 🛟 Demo-Safe by Design
Every Gemini call has a local, rule-based fallback. If the API key is missing or a call fails, the app drops into **Simulation Mode** with a visible notice — the demo never breaks on stage.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| Backend | Express (via `tsx`/esbuild-bundled Node server) |
| AI | Gemini API (`@google/genai`) — multimodal OCR, forecasting explanations, document drafting |
| Maps | Google Maps JavaScript API (`@vis.gl/react-google-maps`, `@googlemaps/markerclusterer`) |
| Charts | Recharts |
| Icons / Motion | lucide-react, motion |

---

## 🚀 Run Locally

**Prerequisites:** Node.js

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables** — copy `.env.example` to `.env.local` and fill in:

   | Variable | Required | Description |
   |---|---|---|
   | `GEMINI_API_KEY` | Yes (for live AI features) | Your Gemini API key. Falls back to Simulation Mode if unset. |
   | `GOOGLE_MAPS_PLATFORM_KEY` | Yes (for the India PHC Map) | Google Maps Platform key for the GIS/map layers. |
   | `APP_URL` | Auto-injected on AI Studio/Cloud Run | Self-referential URL for callbacks; safe to leave as-is locally. |

   ```bash
   cp .env.example .env.local
   # then edit .env.local with your keys
   ```

3. **Run in development**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

View the live AI Studio app: https://ai.studio/apps/c145aa0f-04a0-4f76-879e-81fda5826f3b

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/phcs` | Fetch all PHC/CHC records, forecasts, and risk analysis |
| POST | `/api/simulation/toggle` | Force Simulation Mode on/off for demo control |
| POST | `/api/phcs/reset` | Reset the in-memory data model to seed state |
| POST | `/api/phcs/digitize` | Gemini Multimodal OCR — digitize a register photo into structured records |
| POST | `/api/phcs/redistribute-draft` | Gemini-drafted stock transfer order between facilities |
| POST | `/api/phcs/redistribute-approve` | Execute an approved transfer and update inventories in real time |
| POST | `/api/phcs/explain-forecast` | Gemini reasoning layer — one-sentence, language-aware explanation of a forecast |

---

## 📁 Project Structure

```
├── server.ts                        # Express server + Gemini API integration + seed data
├── src/
│   ├── App.tsx                      # Main dashboard: telemetry, digitizer, redistribution tabs
│   ├── components/
│   │   └── EpidemiologicalGoogleMap.tsx   # India PHC Map with GeoJSON state/district drill-down
│   ├── types.ts                     # Shared TypeScript interfaces (PHCData, ForecastResult, etc.)
│   ├── main.tsx                     # React root entry point
│   └── index.css                    # Tailwind entry
├── index.html
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

---

## 🎯 Why This Matters

- **Real deployment potential** — this is designed for pilot use in an actual PHC, district, or state health department, not just a demo.
- **Zero behavior change for health workers** — digitizes what they already do (paper registers), no new app to learn.
- **Explainable, not a black box** — every risk score and forecast comes with a plain-language reason, in the health worker's own language.
- **Demo-resilient** — simulation fallback means judges see a working product even without live API access.

---

