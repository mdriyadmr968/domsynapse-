# DomSynapse Demo App 🚀

> Interactive Next.js 14 playground demonstrating neural in-app copilot interactions, multi-step form autofilling, spotlights, undo/redo, voice input, and streaming responses.

---

## Getting Started

### 1. Install Dependencies & Build Workspace
From the repository root:

```bash
pnpm install
pnpm build
```

### 2. Configure Environment (Optional)
If you wish to test with live AI providers (OpenAI, Anthropic, or Gemini), create a `.env.local` file in `apps/demo`:

```bash
# apps/demo/.env.local
OPENAI_API_KEY=your_openai_api_key_here
# or
ANTHROPIC_API_KEY=your_anthropic_api_key_here
# or
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Note**: An API key is **not required** to test the demo! When no API key is configured, DomSynapse falls back to client-side local smart assistant simulation.

### 3. Launch Development Server

```bash
pnpm --filter demo dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Playground Features

- **Multi-Tab Onboarding Form**:
  - **Profile Information**: Name, Email, Role, Company, Bio, Newsletter checkbox.
  - **Billing & Subscription**: Cardholder Name, Masked Card Number (`data-synapse-mask`), Expiry, CVV, Billing Address.
  - **Workspace Preferences**: Theme, Notification preferences, Language.
- **Voice-to-Action**: Click the microphone icon in the bottom-right dock to dictate instructions via speech recognition.
- **Diff Review Modal**: See previous values side-by-side with proposed AI values before applying changes.
- **Visual Spotlight**: Test highlighting form fields with smooth scroll and guidance tooltips.
- **Undo / Redo History**: Safely revert and re-apply autofill actions using the dock history buttons.
- **Cross-Tab Synchronization**: Open [http://localhost:3000](http://localhost:3000) in two tabs side-by-side and observe undo/redo actions and spotlights sync in real-time.

---

## License

MIT © [DomSynapse Contributors](https://github.com/mdriyadmr968/domsynapse-)
