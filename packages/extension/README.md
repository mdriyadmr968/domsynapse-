# @domsynapse/extension

> Manifest V3 Browser Extension for Chrome, Edge, and Brave powering DOM-aware AI Web Copilot assistance on any webpage.

## Features

- **Universal DOM Understanding**: Injects the `@domsynapse/core` observer into any web form or workflow.
- **Smart Autofill**: In-page diff confirmation card before any fields are modified.
- **Spotlight Guidance**: Highlights target fields and scrolls them smoothly into view.
- **Full History**: In-browser Undo / Redo for every autofilled input.
- **Custom AI Backends**: Easily configure your local or hosted AI endpoint (Next.js, Express, Hono, OpenAI, Anthropic, Gemini) via the extension popup.

## Development

```bash
# Build extension bundle
pnpm --filter @domsynapse/extension run build

# Load in Chrome:
# 1. Navigate to chrome://extensions/
# 2. Toggle "Developer mode" on (top right)
# 3. Click "Load unpacked"
# 4. Select packages/extension/dist
```
