# :rocket: NOMETA - Intelligent AI Metadata Generator (2026)

<p align="center">
  <strong>Turn any file into marketplace-ready, SEO-optimized metadata in seconds.</strong><br/>
  Built for stock creators, designers, marketers, and high-volume content teams.
</p>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/Platform-Web_App-0f172a?style=for-the-badge&logo=googlechrome&logoColor=white" />
  <img alt="Language" src="https://img.shields.io/badge/JavaScript-ES_Modules-f7df1e?style=for-the-badge&logo=javascript&logoColor=111" />
  <img alt="Build" src="https://img.shields.io/badge/Build-esbuild-ffcf00?style=for-the-badge" />
  <img alt="CSS" src="https://img.shields.io/badge/CSS-Tailwind_3-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=fff" />
  <img alt="Status" src="https://img.shields.io/badge/Status-Active_Development-16a34a?style=for-the-badge" />
</p>

---

## :sparkles: Why NOMETA?

NOMETA is a **client-side AI metadata studio** that analyzes images and generates high-converting metadata for stock and SEO workflows.

Instead of manually writing titles, descriptions, tags, alt text, and social snippets, NOMETA gives you a **full metadata package** with strategy-level output.

---

## :package: What You Get Per Image

- :label: SEO title
- :memo: Meta description
- :key: Keywords/tags
- :card_file_box: Suggested category
- :mega: Social caption + hashtags
- :wheelchair: Alt text
- :page_facing_up: JSON-LD structured data
- :bar_chart: Technical stats + quality insights
- :art: Color palette and image properties
- :compass: Strategy object (deep SEO reasoning + ordering plan)

---

## :globe_with_meridians: Marketplace-Aware Modes

NOMETA supports strategy tuning for:

- :earth_africa: General mode
- :art: Adobe Stock
- :camera_flash: Shutterstock
- :camera: iStock
- :frame_with_picture: Getty Images
- :clapper: Pond5
- :jigsaw: Vecteezy
- :gem: Freepik
- :thread: Creative Fabrica

---

## :electric_plug: AI Providers Supported

- `Google Gemini`
- `Groq`
- `OpenRouter`

Provider/model selection is configurable in the UI, and keys/models are stored per provider in browser storage.

---

## :zap: Core Capabilities

### 1. Single + Batch Image Processing
- Upload one image or a full queue
- Track status per item: `pending / processing / done / error`
- Retry only failed items

### 2. Advanced Prompt Controls
- :control_knobs: Temperature control (creativity)
- :racehorse: Speed modes (`1x`, `2x`, `3x`, `4x`)
- :straight_ruler: Dynamic constraints (title/description/keyword limits)
- :puzzle_piece: Target keyword chip input
- :pencil2: Custom prompt manager with persistence

### 3. Smart Export Options
- `JSON` export (single item)
- `CSV` export (batch output)
- Embedded metadata download:
  - JPG -> APP1 XMP
  - PNG -> iTXt XMP
  - SVG -> `<metadata>` block
  - Unsupported formats can be normalized to PNG for analysis compatibility

### 4. Local-First UX
- Saves provider key/model config locally
- Saves marketplace, controls, and custom prompt
- Keeps recent history for faster repeated workflows

---

## :hammer_and_wrench: Tech Stack

- **Frontend:** HTML + Tailwind CSS + custom CSS
- **Logic:** Vanilla JavaScript (ES Modules)
- **Build:** esbuild, html-minifier-terser, tailwindcss
- **Optional hardening:** javascript-obfuscator
- **Packaging:** JSZip

---

## :file_folder: Project Structure

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
|   |   |-- utils/
|   |   `-- ui/
|   |-- tag-input/
|   `-- Icon/
|-- scripts/
|   |-- build-vercel.mjs
|   |-- dev-local.mjs
|   |-- local-host-server.mjs
|   |-- verify-dist-sync.mjs
|   `-- verify-metadata-tool.mjs
|-- dist/
|-- netlify.toml
|-- vercel.json
|-- _headers
`-- README.md
```

---

## :traffic_light: Quick Start

### Prerequisites

- Node.js `18+`
- npm

### Install

```bash
npm install
```

### Run Dev Mode

```bash
npm run dev
```

Default local URL:

```text
http://localhost:4173
```

Also available for Windows one-click run:

```text
Run-NOMETA-Localhost.bat
```

---

## :lock: API Key Setup

Inside the app:

1. Select provider (`Gemini`, `Groq`, or `OpenRouter`)
2. Paste API key
3. Choose model
4. Click save

Key portals:

- Gemini: https://aistudio.google.com/apikey
- Groq: https://console.groq.com/keys
- OpenRouter: https://openrouter.ai/keys

---

## :scroll: npm Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Full dev pipeline: watch `src`, rebuild `dist`, serve with live reload |
| `npm run dev:host` | Build once, then host `dist` |
| `npm run build:tailwind` | Regenerate `src/css/tailwind.generated.css` |
| `npm run build` | Production build to `dist` |
| `npm run build:secure` | Alias of `build` |
| `npm run build:obfuscate` | Build with optional JS obfuscation |
| `npm run verify` | Smoke checks for metadata engine and registry behavior |
| `npm run verify:dist` | Rebuild + verify `dist` sync integrity |

---

## :globe_with_meridians: Deployment

This project is static-host ready.

- Vercel config: `vercel.json`
- Netlify config: `netlify.toml`
- Cache/header rules: `_headers`

### Vercel Setup

1. Import repository
2. Framework preset: `Other`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy

### Cache & Update Behavior

- Local dev reflects changes instantly via live reload
- Hosted environments require a new deployment for code changes
- Cache policies are tuned to reduce stale frontend artifacts

---

## :shield: Security Notes

- This is a **frontend/client-side** app
- API keys are stored in browser storage for the current user
- Client-delivered frontend code is inspectable by end users
- For stronger secret protection, route provider calls through your backend

---

## :handshake: Contributing

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Push branch
5. Open a pull request

---

## :pushpin: Implementation Notes

- Debug mode:
  - URL: `?debug=1`
  - Local storage key: `metadata_debug_mode = '1'`
- A legacy `grok` module may exist in source, but active provider flow uses `gemini`, `groq`, and `openrouter`.

---

## :page_with_curl: License

A `LICENSE` file is not currently included in this repository.
Add one to define explicit open-source usage terms.

---

<p align="center">
  Made with :heart: for creators who want speed, clarity, and better rankings.
</p>