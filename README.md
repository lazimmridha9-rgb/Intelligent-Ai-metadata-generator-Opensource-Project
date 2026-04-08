# NOMETA - Intelligent AI Metadata Generator

A local-first, AI-powered metadata workstation for stock creators, SEO teams, and image-heavy publishing workflows.

NOMETA analyzes images and generates a full metadata package with marketplace-aware strategy, structured output, technical insights, and export-ready files.

## Core Highlights

- Multi-provider AI pipeline: `Gemini`, `Groq`, `OpenRouter`
- Marketplace strategies: `General`, `Adobe`, `Shutterstock`, `iStock`, `Getty`, `Pond5`, `Vecteezy`, `Freepik`, `Creative Fabrica`
- Single + batch processing with queue status and retry for failed items
- Advanced controls: temperature, speed mode (`1x` to `4x`), constraints (title/description/keywords), target keywords, custom prompt templates
- Rich output: SEO title, description, tags, category, filename, hashtags, alt text, JSON-LD, strategy objects
- Embedded metadata export into image files (XMP for JPG/PNG/SVG)
- Electron desktop packaging support for Windows

## What This Project Actually Generates

For each processed image, NOMETA can produce:

- `title`
- `description`
- `keywords/tags`
- `suggestedCategory`
- `suggestedFilename`
- `socialCaption`
- `hashtags`
- `altText`
- `jsonLd`
- `technicalStats`
- deep `strategy` sections (keyword clusters, ordering plan, compliance checks, title score breakdown)

## Architecture Overview

```text
UI (src/index.html + Tailwind + custom CSS)
  -> app.js orchestrates workflow/state
  -> provider-registry.js manages provider/model/key storage
  -> metadata-engine.js builds marketplace-aware prompt strategy
  -> provider clients call external APIs
      - gemini-api.js
      - groq-api.js
      - openrouter-api.js
  -> response parser normalizes model JSON
  -> post-processing + constraints enforcement
  -> render result tabs (SEO, Strategy, Social, Technical)
  -> export
      - JSON
      - CSV (batch)
      - embedded image metadata (XMP)
```

## AI Providers and Model Handling

### Providers in UI

- `Google Gemini`
- `Groq`
- `OpenRouter`

### Provider behavior

- Provider keys and selected model are stored per provider in local storage.
- OpenRouter and Gemini include JSON repair retry logic when model output parsing fails.
- OpenRouter has vision-model compatibility error messaging for unsupported models.

## Marketplace Strategy Engine

`src/js/metadata-engine.js` switches strategy classes by marketplace.
Each marketplace class supplies:

- prompt shape and platform-aware rules
- defaults for metadata constraints
- output sanitization/normalization logic

This keeps output style aligned with target marketplace search behavior.

## Image Processing and Compatibility

NOMETA accepts common and extended image formats including:

- direct: `jpg`, `jpeg`, `png`, `webp`
- extended detection: `svg`, `svgz`, `heic`, `heif`, `avif`, `bmp`, `tif`, `tiff`, `ico`

Internal behavior:

- small direct-compatible files can be sent as-is
- unsupported/oversized files are normalized to optimized JPEG for AI analysis
- export pipeline can embed metadata into:
  - JPEG via APP1 XMP
  - PNG via iTXt XMP
  - SVG via `<metadata>` block
- unsupported export formats are converted to PNG fallback with embedded metadata

## Advanced Controls

- Temperature control (`0.0` to `1.0`)
- Speed modes (`1x`, `2x`, `3x`, `4x`) adjust token budget and batch delay
- Metadata constraints:
  - title length
  - description length
  - keyword count
- Target keyword chip input with include-priority behavior
- Custom strategy/prompt manager with preset templates and auto-save

## Batch Workflow

Batch queue includes status lifecycle:

- `pending`
- `processing`
- `done`
- `error`

Features:

- process all queued files
- retry failed items only
- export successful batch output to CSV
- export embedded metadata files for completed items

## Local-First Data Persistence

Stored in browser storage:

- provider selection
- provider API keys
- selected model per provider
- marketplace selection
- speed and constraint preferences
- custom strategy prompt
- recent history items (with storage-safe image truncation logic)

## Technical Analysis Panel

Beyond model output, NOMETA computes local technical metrics from image pixels:

- dimensions, megapixels, aspect ratio, orientation
- transparency detection
- exposure/contrast/saturation heuristics
- Laplacian-based sharpness estimate
- color palette extraction
- heuristic quality score
- generated SEO `<head>` snippet with JSON-LD block

## Project Structure

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
|   |   |-- export/
|   |   |-- technical/
|   |   |-- speed-control/
|   |   |-- custom-prompt/
|   |   |-- utils/
|   |   `-- ui/
|   |-- tag-input/
|   `-- Icon/
|-- scripts/
|   |-- dev-local.mjs
|   |-- local-host-server.mjs
|   |-- build-vercel.mjs
|   |-- verify-metadata-tool.mjs
|   `-- verify-dist-sync.mjs
|-- electron/
|   `-- main.cjs
|-- dist/
|-- release/
|-- README.md
|-- package.json
|-- vercel.json
|-- netlify.toml
`-- _headers
```

## Quick Start

### Prerequisites

- Node.js `18+`
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

This runs full local pipeline:

- watches `src`
- rebuilds `dist`
- hosts `dist` on local server with live reload

Default URL: `http://localhost:4173`

### Production Build

```bash
npm run build
```

### Verification

```bash
npm run verify
npm run verify:dist
```

## Desktop (Electron)

Run local desktop app (loads built `dist/index.html`):

```bash
npm run electron:start
```

Create Windows installer:

```bash
npm run dist:win
```

Output is generated in `release/`.

## npm Scripts Reference

| Script | Purpose |
|---|---|
| `npm run dev` | Watch `src`, rebuild `dist`, and serve locally with live reload |
| `npm run dev:host` | Build once and host `dist` with live reload |
| `npm run build:tailwind` | Regenerate Tailwind output CSS |
| `npm run build` | Tailwind + production build to `dist` |
| `npm run build:secure` | Alias to `build` |
| `npm run build:obfuscate` | Build with JavaScript obfuscation |
| `npm run verify` | Runtime verification for parser/registry/engine logic |
| `npm run verify:dist` | Rebuild + distribution sync verification |
| `npm run electron:start` | Build then launch Electron app |
| `npm run dist:win` | Build and package Windows installer via electron-builder |

## Deployment

This is a static-frontend project and can be deployed to static hosts.

Included configs:

- `vercel.json`
- `netlify.toml`
- `_headers`

Typical deploy config:

- Build command: `npm run build`
- Output directory: `dist`

## Security Notes

Important:

- This app runs client-side.
- API keys are stored in browser local storage.
- Any client-side code can be inspected by end users.

For stronger secret control in production, route provider calls through a backend service.

## Troubleshooting

- If generated output is malformed JSON, Gemini/OpenRouter retry logic attempts repair once automatically.
- If OpenRouter model fails with vision support errors, choose a known vision model from the dropdown.
- If stale assets appear after deploy, redeploy and confirm host caching headers.

## Contributing

1. Fork repository
2. Create branch
3. Commit changes
4. Push branch
5. Open pull request

## License

No `LICENSE` file is currently present in this repository.
Add one to define legal usage permissions explicitly.
