# Intelligent AI Metadata Generator (2026)

A browser-based metadata workflow tool for stock creators, designers, and digital marketers.  
It analyzes images with multimodal AI and generates SEO-focused metadata tuned for multiple marketplaces.

## What this app does

- Accepts single image upload or multi-image batch queue.
- Supports AI providers:
  - Google Gemini
  - Groq
  - OpenRouter
- Generates:
  - Title
  - Description
  - Keywords
  - Category
  - Social caption and hashtags
  - Alt text
  - Technical stats
  - Suggested filename
  - Strategy object (step-by-step SEO reasoning)
- Adds marketplace-specific prompt strategies:
  - General
  - Adobe Stock
  - Shutterstock
  - iStock
  - Getty Images
  - Pond5
  - Vecteezy
  - Freepik
  - Creative Fabrica
- Exports metadata as:
  - JSON
  - Batch CSV
  - Embedded file output (XMP in JPG/PNG/SVG, ZIP for batch)

## Major features

### 1) Multi-provider image AI

The app uses provider-specific API clients and a shared JSON parser fallback layer for more resilient output parsing.

- Gemini: `gemini-2.5-pro`, `gemini-2.5-flash-lite`, `gemini-2.5-flash`
- Groq: `meta-llama/llama-4-scout-17b-16e-instruct`
- OpenRouter: `openai/gpt-4o`, `anthropic/claude-3.7-sonnet`, `google/gemini-2.0-flash-001`, `meta-llama/llama-3.2-11b-vision-instruct`

### 2) Advanced prompt controls

- Temperature slider (persisted in local storage)
- Speed mode: `1x`, `2x`, `3x`, `4x` (changes max tokens and batch delay)
- Dynamic constraints:
  - title length
  - description length
  - keyword count
- Target keyword chip input (deduplicated and prioritized)
- Custom prompt override with templates and autosave

### 3) Batch workflow

- Drag/drop multiple files to queue
- Per-item status: pending, processing, done, error
- Retry only failed items
- Batch CSV export
- Batch embedded metadata ZIP export

### 4) Metadata embedding

Embedded download writes metadata directly into files:

- JPEG: APP1 XMP
- PNG: iTXt XMP
- SVG: `<metadata>` block
- Unsupported image formats are converted to PNG for compatibility

### 5) Technical and SEO helper output

For each generated item, the app also renders:

- Image properties (dimensions, ratio, megapixels, file size, alpha presence)
- Quality heuristics (sharpness, exposure, contrast, saturation)
- Dominant color palette
- Copy-ready SEO `<head>` snippet with JSON-LD

### 6) Local-first persistence

Saved in browser storage:

- Provider API keys
- Selected models
- Marketplace selection
- Speed, temperature, and constraints
- Custom prompt
- Recent generation history (up to 5 items, with storage fallback handling)

## Tech stack

- Frontend: HTML, Tailwind CSS, custom CSS
- Logic: Vanilla JavaScript ES modules
- Build tooling: esbuild, html-minifier-terser, tailwindcss, javascript-obfuscator (optional)
- Packaging: JSZip for batch embedded download archives

## Project structure

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
|   |-- verify-metadata-tool.mjs
|   |-- local-host-server.mjs
|   |-- dev-local.mjs
|   `-- build-vercel.mjs
|-- vercel.json
|-- netlify.toml
|-- _headers
`-- README.md
```

## Getting started

### Requirements

- Node.js 18+ recommended
- npm

### Install

```bash
npm install
```

### Run in development

Start the built-in live development host:

```bash
npm run dev
```

Open: `http://localhost:4173`

You can also run the one-click launcher on Windows: `Run-NOMETA-Localhost.bat`

### Configure API access

Inside the app:

1. Choose provider (`Gemini`, `Groq`, `OpenRouter`)
2. Paste API key
3. Choose model
4. Click save

Provider key pages:

- Gemini: <https://aistudio.google.com/apikey>
- Groq: <https://console.groq.com/keys>
- OpenRouter: <https://openrouter.ai/keys>

## npm scripts

- `npm run verify`  
  Smoke checks for parser behavior, provider registry storage, and metadata engine routing.
- `npm run dev`  
  Watches `src/`, rebuilds `dist/` on changes, and serves `dist/` with live reload. Prefers port `4173` and auto-falls back to the next free port if needed.
- `npm run dev:host`  
  Runs a fresh build first, then serves `dist/` (useful when you just want a clean local preview without watch mode). Prefers `4173` and auto-falls back if needed.
- `npm run build:tailwind`  
  Rebuilds `src/css/tailwind.generated.css`.
- `npm run build`  
  Builds production output into `dist/` (bundled/minified JS + minified HTML + static assets).
- `npm run verify:dist`  
  Rebuilds `dist/` and verifies that hashed CSS/JS references and copied static files are consistent with `src/`.
- `npm run build:secure`  
  Alias of `npm run build`.
- `npm run build:obfuscate`  
  Production build with optional JS obfuscation.

## Deployment

This project is ready for static hosting.

- Vercel config: `vercel.json`
- Netlify config: `netlify.toml`
- Additional headers: `_headers`

### Live update behavior (important)

- Local dev (`npm run dev`): file save করলে live reload হয়।
- Live hosting (Vercel/Netlify): code change reflect করতে deploy লাগবে (usually Git push -> auto deploy)।
- Browser stale cache avoid করার জন্য hosting cache headers `must-revalidate` করা আছে।

### Vercel quick setup

1. Import repository
2. Framework preset: `Other`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy

## Privacy and security notes

- This is a client-side app. API keys are stored in the browser storage of the current user.
- Frontend code is always visible to end users in browser-delivered apps.
- For strong secret protection, move provider calls to a backend you control.

## Known implementation notes

- A legacy `grok` module exists in source, but the active provider selector currently uses `gemini`, `groq`, and `openrouter`.
- Debug mode can be enabled with:
  - query string: `?debug=1`
  - local storage: `metadata_debug_mode = '1'`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push your branch
5. Open a pull request

## License

No license file is currently included in this repository.  
Add a `LICENSE` file if you want explicit open-source usage terms.
