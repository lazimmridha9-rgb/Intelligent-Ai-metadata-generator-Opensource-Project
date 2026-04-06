# 🎯 2026 Advanced SEO Optimized Metadata Generator

A professional, cutting-edge web tool designed to revolutionize metadata generation for microstock photographers and digital artists. Powered by the world's most advanced AI models—**Google Gemini**, **xAI Grok**, and **Groq**—this application delivers deep, SEO-optimized titles, descriptions, and keywords to maximize visibility and sales across all major stock agencies.

## ✨ Key Features

### 🧠 Multi-Model AI Intelligence
Leverage state-of-the-art AI for unparalleled image understanding:
- **Google Gemini**: Utilizes Gemini 1.5 Pro & Flash for superior multimodal analysis.
- **xAI Grok**: Integrates Grok's unique reasoning capabilities.
- **Groq**: Delivers lightning-fast inference using LPU technology.
- **Adjustable Parameters**: Fine-tune "Temperature" and "Max Tokens" for creative control.

### 🌍 Comprehensive Marketplace Support
Tailored metadata generation for specific platform algorithms:
- **Adobe Stock**: Optimized for Adobe's relevance engine.
- **Shutterstock**: Keyword precision for high visibility.
- **iStock (Getty Images)**: ESP-compliant formatting.
- **Getty Images**: Editorial and creative standards.
- **Pond5**: Specialized for video and stock footage metadata.
- **Vecteezy**: Vector and illustration focus.
- **Freepik**: High-volume, trend-aware tagging.
- **Creative Fabrica**: POD (Print on Demand) friendly descriptions.
- **General Mode**: Universal metadata for personal archives or other sites.

### 🚀 Advanced SEO & Workflow Tools
- **Deep Image Analysis**: Detects objects, lighting, mood, artistic style, and conceptual context.
- **Smart SEO Optimization**: Generates high-ranking keywords, automatically sorted by relevance.
- **Constraint Compliance**: Automatically handles character limits and formatting rules for each marketplace.
- **History Management**: Local storage-based history to revisit and reuse previous generations.
- **Copy & Export**: One-click copy to clipboard and JSON export functionality.

### 🎨 Modern & Responsive Interface
- **Glassmorphism UI**: A sleek, modern aesthetic using Tailwind CSS.
- **Drag & Drop**: Intuitive file handling.
- **Live Preview**: Real-time editing of generated metadata.
- **Mobile Friendly**: Fully responsive design for on-the-go usage.

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Tailwind CSS via CDN)
- **Logic**: Vanilla JavaScript (ES6+ Modules)
- **Icons**: FontAwesome 6
- **Architecture**: Client-side only (No backend server required for logic)

## 📦 Installation & Setup

Since this project uses **ES Modules** for a modular architecture, it requires a local web server. Opening `index.html` directly via file protocol (`file://`) will cause CORS errors.

### Option 1: VS Code (Recommended)
1.  Open the project folder in **Visual Studio Code**.
2.  Install the **Live Server** extension by Ritwick Dey.
3.  Right-click on `index.html` and select **"Open with Live Server"**.

### Option 2: Python
If you have Python installed, you can start a simple HTTP server:
```bash
# Python 3
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

### Option 3: Node.js
If you have Node.js installed:
```bash
npx http-server
```

## ⚙️ Configuration Guide

1.  **Obtain API Keys**:
    *   **Gemini**: [Google AI Studio](https://aistudio.google.com/)
    *   **Grok**: [xAI Console](https://console.x.ai/)
    *   **Groq**: [Groq Console](https://console.groq.com/)
2.  **Configure the App**:
    *   Launch the application.
    *   Click the **Settings** (Gear icon) in the top navigation.
    *   Select your preferred **AI Provider**.
    *   Paste your **API Key**.
    *   Select a **Model** from the dropdown list.
3.  **Start Creating**:
    *   Drag and drop an image into the upload zone.
    *   Select a target **Marketplace**.
    *   Click **Generate Metadata**.

## Project Structure

```
2026-Metadata-Generator/
|- css/
|  |- style.css                    # Custom glassmorphism styles and animations
|- js/
|  |- gemini/                      # Google Gemini API integration
|  |- grok/                        # xAI Grok API integration
|  |- groq/                        # Groq API integration
|  |- OpenRouter/                  # OpenRouter API integration
|  |- MicroStock-Market/           # Marketplace-specific prompt logic
|  |- providers/                   # Provider registry (storage/model settings)
|  |- technical/                   # Advanced image technical analysis renderer
|  |- ui/                          # Toast, modal, and count helpers
|  |- utils/                       # Shared JSON response parser and utility helpers
|  |- app.js                       # Main application controller
|  |- metadata-engine.js           # Core prompt engineering and strategy routing
|  |- history-manager.js           # Local storage history management
|- scripts/
|  |- verify-metadata-tool.mjs     # Smoke verification for parser/engine/provider modules
|- index.html                      # Main application entry point
`- README.md                       # Project documentation
```

## Quick Verification

Run local smoke checks:

```bash
node scripts/verify-metadata-tool.mjs
```

This verifies:
- shared AI JSON parsing flow
- provider registry storage behavior
- metadata engine marketplace switching and keyword post-processing

## Live Hosting Readiness

This project is now prepared for direct static hosting (no backend build step).

### Included deployment configs
- `netlify.toml` for Netlify deploy + cache/security headers
- `vercel.json` for Vercel deploy + cache/security headers
- `_headers` for hosts that support Netlify-style headers

### Before going live
1. Deploy with HTTPS enabled.
2. Open the deployed URL and run one test image on each provider:
   - Gemini
   - Groq
   - OpenRouter
3. Confirm browser localStorage is available (API keys are stored client-side in the user browser).
4. If debugging is needed in production, open URL with `?debug=1` or set `localStorage.metadata_debug_mode = '1'`.

## Vercel Production (Stable Build)

This repo now includes a production build pipeline for Vercel:
- Bundles all JS into a single minimized file (`dist/js/app.bundle.js`)
- Minifies HTML for production output
- Stable deployment uses `npm run build` (same output as `build:secure`).
- Optional obfuscation is available manually with `npm run build:obfuscate` (not recommended for default deploy).

### Deploy steps (Vercel)
1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Keep default framework as **Other**.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy.

### Important security note
Client-side web apps cannot be made 100% hidden. Browser users can always view delivered frontend code.
Minification is enabled by default. If you choose obfuscation, test thoroughly before production. True secret protection still requires moving sensitive logic to a backend API.

## Contributing

We welcome contributions! If you have ideas for new features or bug fixes:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

## 📄 License

This project is open-source. Feel free to use, modify, and distribute.

---
*Designed for the future of stock marketplaces and seo work. © 2026*

