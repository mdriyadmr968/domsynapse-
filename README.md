# DomSynapse 🧠✨

> **Neural Context-Aware In-App AI Copilot**  
> Connects a live neural bridge between your active web page and AI: observing forms, masking sensitive PII, spotlighting interface elements, and performing interactive autofills with review diffs and rollback.

[![CI](https://github.com/mdriyadmr968/domsynapse-/actions/workflows/ci.yml/badge.svg)](https://github.com/mdriyadmr968/domsynapse-/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Architecture Overview

```
+-------------------------------------------------------------------------+
|                              HOST APPLICATION                           |
|                                                                         |
|  +--------------------+   +---------------------+   +----------------+  |
|  | Current Route/URL  |   | DOM / Semantic Tree |   | React State    |  |
|  +---------+----------+   +----------+----------+   +-------+--------+  |
|            |                         |                      |           |
|            +-------------------+     |     +----------------+           |
|                                |     |     |                            |
|                                v     v     v                            |
|                    +-----------------------------+                      |
|                    |     @domsynapse/core        |                      |
|                    |  - Semantic DOM Pruner      |                      |
|                    |  - PII Masking Shield       |                      |
|                    |  - Action & Tool Dispatcher |                      |
|                    |  - Multi-level Undo/Rollback|                      |
|                    +--------------+--------------+                      |
|                                   |                                     |
|                                   v                                     |
|                    +-----------------------------+                      |
|                    |     @domsynapse/react       |                      |
|                    |  - <DomSynapseProvider />   |                      |
|                    |  - <DomSynapseDock />       |                      |
|                    |  - Element Spotlight / Glow |                      |
|                    |  - Diff Preview & Autofill  |                      |
|                    +--------------+--------------+                      |
+-----------------------------------|-------------------------------------+
                                    | Secure Streaming API
                                    v
                     +------------------------------+
                     |   @domsynapse/server (Edge)  |
                     |   - OpenAI / Anthropic /     |
                     |     Gemini Proxy & Rate Limit|
                     +------------------------------+
```

---

## Packages

| Package | Version | Description |
| :--- | :--- | :--- |
| [`@domsynapse/core`](./packages/core) | `0.1.0` | Framework-agnostic DOM observer, semantic serializer, PII shield, and action engine. |
| [`@domsynapse/react`](./packages/react) | `0.1.0` | React context provider, collapsible dock, spotlight overlay, and autofill diff modals. |
| [`@domsynapse/server`](./packages/server) | `0.1.0` | Edge handlers & LLM proxies for Next.js App Router, Express, and Hono. |
| [`demo`](./apps/demo) | `0.1.0` | Interactive Next.js playground testing multi-step forms and copilot actions. |

---

## Quick Start

### 1. Install packages
```bash
pnpm add @domsynapse/core @domsynapse/react
# For backend edge handlers:
pnpm add @domsynapse/server
```

### 2. Frontend React Integration
```tsx
import { DomSynapseProvider, DomSynapseDock } from '@domsynapse/react';
import '@domsynapse/react/styles.css';

export default function App() {
  return (
    <DomSynapseProvider
      apiEndpoint="/api/copilot"
      options={{
        autoObserveForms: true,
        piiMasking: true,
        trackFocus: true,
      }}
    >
      <YourAppContent />

      {/* Floating copilot dock in the bottom-right corner */}
      <DomSynapseDock position="bottom-right" />
    </DomSynapseProvider>
  );
}
```

### 3. Backend Handler (Next.js App Router)
```ts
// app/api/copilot/route.ts
import { createDomSynapseNextHandler } from '@domsynapse/server';

export const POST = createDomSynapseNextHandler({
  provider: 'openai', // 'openai' | 'anthropic' | 'gemini'
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});
```

---

## Key Features

- **⚡ Semantic DOM Pruner**: Reduces HTML token overhead by ~85% before feeding context to LLMs.
- **🛡️ PII Masking Shield**: Automatic redaction of credit cards, passwords, SSNs, and custom `data-synapse-mask` fields.
- **🎯 Two-Way Element Spotlight**: Directs user attention with pulsing glows and instructive popovers.
- **🔍 Diff Review & Autofill**: Users inspect proposed form changes before applying them with a single click.
- **↩️ Multi-Level Undo & Rollback**: Safe atomic undo/redo for automated form actions.
- **🌐 Framework Agnostic Core**: Core engine runs in any modern browser without React or dependencies.

---

## Running the Demo

```bash
pnpm install
pnpm build
pnpm --filter demo dev
```

Open [http://localhost:3000](http://localhost:3000) to test the live interactive onboarding playground!

---

## License

MIT © [DomSynapse Contributors](https://github.com/mdriyadmr968/domsynapse-)
