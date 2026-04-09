# 🚀 NOMETA - Intelligent AI Metadata Generator (2026)

<div align="center">

### ⚡ Turn any image into marketplace-ready metadata with AI

Generate SEO title, description, keyword stack, social copy, alt text, structured data, and embedded metadata files from one workflow.

<p>
  <img src="https://res.cloudinary.com/dllfxrcz2/image/upload/f_auto,q_auto/45254554_carhlf" alt="NOMETA advertising preview - clean and professional metadata generator interface" width="1100" />
</p>

<p>
  <img src="https://img.shields.io/github/stars/lazimmridha9-rgb/Intelligent-Ai-metadata-generator-Opensource-Project?style=for-the-badge&logo=github" alt="GitHub stars" />
  <img src="https://img.shields.io/github/forks/lazimmridha9-rgb/Intelligent-Ai-metadata-generator-Opensource-Project?style=for-the-badge&logo=github" alt="GitHub forks" />
  <img src="https://img.shields.io/github/last-commit/lazimmridha9-rgb/Intelligent-Ai-metadata-generator-Opensource-Project?style=for-the-badge" alt="Last commit" />
  <img src="https://img.shields.io/github/issues/lazimmridha9-rgb/Intelligent-Ai-metadata-generator-Opensource-Project?style=for-the-badge" alt="Open issues" />
</p>

<p>
  <img src="https://img.shields.io/badge/Platform-Web%20App-0f172a?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Platform" />
  <img src="https://img.shields.io/badge/Runtime-Vanilla%20JS-111827?style=for-the-badge&logo=javascript&logoColor=f7df1e" alt="Runtime" />
  <img src="https://img.shields.io/badge/Build-esbuild-ffcf00?style=for-the-badge" alt="Build" />
  <img src="https://img.shields.io/badge/CSS-Tailwind%203-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=fff" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Desktop-Electron-47848f?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
</p>

</div>

---

## ✨ Why NOMETA

NOMETA is a client-side AI metadata studio for creators, stock contributors, and SEO teams.

Instead of manually writing image metadata field-by-field, NOMETA generates a complete package with:
- marketplace-aware metadata strategy
- editable structured outputs
- export-ready formats for delivery workflows

---

## 📦 What It Generates Per Image

- 🏷️ SEO title
- 📝 Meta description
- 🔑 Keyword list (exact target count support)
- 🗂️ Category suggestion
- 📣 Social caption and hashtags
- ♿ Alt text
- 🧩 JSON-LD structured data
- 📊 AI technical stats
- 🧠 Advanced strategy object with scoring and ordering plan
- 🎨 Local technical analysis: dimensions, quality heuristics, color palette, SEO head snippet

---

## 🔌 Provider Layer

NOMETA currently supports three active providers in the UI:
- Google Gemini
- Groq
- OpenRouter

Built-in model presets include:
- Gemini 3.1/3 Flash preview series
- Gemini 2.5 Pro / Flash / Flash-Lite
- Groq Llama 4 Scout vision
- OpenRouter presets: GPT-4o, Claude 3.7 Sonnet, Gemini 2.0 Flash, Llama 3.2 Vision

Note:
- A `grok` module exists in source for legacy compatibility, but the active provider registry uses `gemini`, `groq`, and `openrouter`.

---

## 🌍 Marketplace Strategy Modes

NOMETA ships with strategy packs for:
- General
- Adobe Stock
- Shutterstock
- iStock
- Getty Images
- Pond5
- Vecteezy
- Freepik
- Creative Fabrica

Default constraint presets per marketplace:

| Marketplace | Title | Description | Keywords |
|---|---:|---:|---:|
| General | 100 | 200 | 40 |
| Adobe Stock | 70 | 150 | 45 |
| Shutterstock | 120 | 200 | 50 |
| iStock | 60 | 250 | 40 |
| Getty Images | 60 | 250 | 40 |
| Pond5 | 100 | 300 | 50 |
| Vecteezy | 80 | 200 | 40 |
| Freepik | 80 | 200 | 50 |
| Creative Fabrica | 80 | 200 | 40 |

---

## 🧭 Core Workflow

1. Choose provider + model + API key.
2. Select marketplace strategy mode.
3. Tune generation controls (temperature, speed, constraints, tone, target keywords, custom prompt).
4. Upload one or many images.
5. Generate metadata.
6. Review/edit tabs (SEO, strategy, social, technical).
7. Export JSON, CSV, or embedded files.

---

## 🔥 Power Features

### 📁 Single + Batch Processing
- Queue-based multi-file processing
- Status lifecycle: `pending`, `processing`, `done`, `error`
- Retry failed batch items only
- Batch CSV export

### 🎛️ Generation Controls
- Temperature control (`0.0` to `1.0`)
- Speed modes (`1x`, `2x`, `3x`, `4x`) with token/delay tuning
- Advanced constraints:
  - title length
  - description length
  - exact keyword count
- Target keyword chip input with forced inclusion support
- Persistent custom prompt manager

### 🧠 Advanced Output Intelligence
- Strategy summary and buyer persona hints
- Keyword clusters and top keyword scoring
- Title score breakdown (CTR/SEO/clarity/uniqueness)
- Keyword ordering plan per marketplace intent
- Compliance notes and checks

### 📥 Embedded Metadata Export
- JPEG: APP1 XMP embed
- PNG: `iTXt` XMP embed
- SVG: `<metadata>` block injection
- Unsupported image types are converted to PNG for compatibility during embed export
- Batch embedded export as ZIP with optional notes/failure report files

### 🔬 Local Technical Analysis
- Image properties (size, dimensions, ratio, transparency)
- Heuristic quality metrics (sharpness, exposure, contrast, saturation)
- Color palette extraction
- Ready-to-copy SEO `<head>` snippet with JSON-LD

---

## 🏗️ Architecture Snapshot

```text
src/index.html
   -> src/js/app.js (orchestrator)
      -> providers/ (Gemini, Groq, OpenRouter)
      -> metadata-engine + marketplace strategies
      -> controls (temperature, speed, constraints, prompt)
      -> technical analyzer
      -> export/metadata embedder
      -> history manager + UI utilities
```

Build pipeline:
- ⚙️ `tailwindcss` compiles `src/css/tailwind.generated.css`
- 📦 `esbuild` bundles `src/js/app.js`
- 🧾 output assets are content-hashed
- 🧹 `html-minifier-terser` minifies `dist/index.html`
- 🛡️ optional obfuscation via `javascript-obfuscator`

---

## 🛠️ Tech Stack

- Frontend: HTML, Tailwind CSS, custom CSS, vanilla JavaScript (ES modules)
- Build: esbuild, tailwindcss, html-minifier-terser
- Optional hardening: javascript-obfuscator
- Packaging: JSZip
- Desktop wrapper: Electron + electron-builder (Windows NSIS x64)

---

## 🗂️ Project Structure

```text
.
|-- src/
|   |-- index.html
|   |-- css/
|   |-- js/
|   |   |-- app.js
|   |   |-- metadata-engine.js
|   |   |-- providers/
|   |   |-- gemini/
|   |   |-- groq/
|   |   |-- OpenRouter/
|   |   |-- MicroStock-Market/
|   |   |-- speed-control/
|   |   |-- technical/
|   |   |-- export/
|   |   |-- custom-prompt/
|   |   |-- ui/
|   |   `-- utils/
|   |-- tag-input/
|   `-- Icon/
|-- scripts/
|-- electron/
|-- dist/
|-- vercel.json
|-- netlify.toml
|-- _headers
`-- README.md
```

---

## 🚦 Quick Start

### 📌 Requirements

- Node.js 18+
- npm

### 📥 Install

```bash
npm install
```

### 🧪 Development

```bash
npm run dev
```

Default URL:

```text
http://localhost:4173
```

### 🏭 Production Build

```bash
npm run build
```

### ✅ Verify

```bash
npm run verify
npm run verify:dist
```

### 🪟 Windows Local Shortcut

```text
Run-NOMETA-Localhost.bat
```

---

## 📜 NPM Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Watch `src`, rebuild `dist`, serve local host with live reload |
| `npm run dev:host` | Build once and host `dist` |
| `npm run build:tailwind` | Rebuild Tailwind output CSS |
| `npm run build` | Production build to `dist` |
| `npm run build:secure` | Alias of build |
| `npm run build:obfuscate` | Build with JS obfuscation |
| `npm run verify` | Parser/provider/engine smoke checks |
| `npm run verify:dist` | Build + dist synchronization checks |
| `npm run electron:start` | Build then launch Electron app |
| `npm run dist:win` | Build Windows NSIS installer package |

---

## 🔐 API Key Setup

Inside the app:
1. Select provider
2. Paste API key
3. Pick model
4. Save configuration

Provider key portals:
- Gemini: https://aistudio.google.com/apikey
- Groq: https://console.groq.com/keys
- OpenRouter: https://openrouter.ai/keys

---

## 🌐 Deployment

Static-host ready with first-party configs included:
- `vercel.json`
- `netlify.toml`
- `_headers`

Security headers include CSP, frame restrictions, referrer policy, and permissions policy.

Important runtime note:
- This is a client-side app, so provider calls happen from the browser.

---

## 🛡️ Security and Data Notes

- API keys are stored client-side (local storage via safe storage utility)
- If browser local storage is unavailable, app falls back to in-memory storage
- History keeps up to 5 recent items, with safeguards for storage size limits
- For strict secret protection, use your own backend proxy

---

## 🧰 Troubleshooting

- If output JSON fails to parse, providers include auto-repair retry logic for malformed responses
- If model does not support vision (especially on OpenRouter), choose a vision-capable model preset
- If embedded export fails for unusual formats, the app falls back to conversion-based compatibility paths

---

## 🤝 Contributing

1. Fork the repository
2. Create a branch
3. Make your changes
4. Push your branch
5. Open a pull request

---

## 📄 License

A `LICENSE` file is not currently present in this repository.
Add one to define official open-source usage terms.

---

<div align="center">

Built for creators who want faster workflows and stronger metadata quality.

</div>
