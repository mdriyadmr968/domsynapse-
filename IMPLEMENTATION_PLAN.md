# DomSynapse (Neural Context-Aware In-App AI Copilot)
## Technical Architecture, Specification & Implementation Roadmap

> **DomSynapse** (`@domsynapse/core`, `@domsynapse/react`, `@domsynapse/server`) is a framework-agnostic NPM library + React integration that acts as an in-app context-aware AI assistant. Instead of a generic isolated chatbot, DomSynapse connects a neural live link directly to the active web page: reading form inputs, understanding validation errors, answering user questions about the interface, and performing two-way actions (visual element spotlights and interactive autofills with review diffs).

---

## 1. Project Identity & Verified Availability

- **Name**: **`domsynapse`**
- **NPM Package**: `@domsynapse/core`, `@domsynapse/react`, `@domsynapse/server`
- **Registry Status**: Verified 404 (Unclaimed on NPM)
- **Web / GitHub Presence**: 0 collisions on GitHub and Google

---

## 2. Core Architecture

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
|                    |  - Real-time DOM Observer   |                      |
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

## 3. Technology Stack

| Layer | Selected Technology | Rationale |
| :--- | :--- | :--- |
| **Monorepo** | **Turborepo + pnpm** | Clean caching and workspace management. |
| **Language** | **TypeScript 5.x** (Strict Mode) | Full type-safety, automatic `.d.ts` declaration generation. |
| **Bundler** | **`tsup`** (powered by esbuild) | Dual ESM + CJS builds, treeshakeable bundles, minimal overhead. |
| **Headless UI** | **Radix UI Primitives** | Accessible dialogs, popovers, and collapsible dock. |
| **Styling** | **Tailwind CSS + CSS Variables** | Out-of-the-box styling with CSS variable custom tokens. |
| **Testing** | **Vitest + Happy-DOM** | Rapid testing for DOM observer and synthetic event dispatches. |

---

## 4. Implementation Status & Milestones

- [x] **Milestone 1: Core Foundation & Semantic DOM Engine (`@domsynapse/core`)** *(COMPLETED)*
  - Monorepo initialized with `pnpm` workspaces and strict TypeScript.
  - Zero-runtime-dependency core package built with `tsup`.
  - `PIIShield`: Masking passwords, cards, SSNs, API keys, `data-synapse-mask`, `data-synapse-ignore`.
  - `SemanticSerializer`: Token-efficient DOM pruner with ~85% prompt token reduction.
  - `DOMObserver`: Debounced mutation observer, focus tracker, and SPA history router.
  - `ActionDispatcher`: React 16+ synthetic prototype setter for inputs, checkboxes, and selects.
  - 15 passing tests in Vitest / Happy-DOM.

- [x] **Milestone 2: Two-Way Action & Tool Engine** *(COMPLETED)*
  - Tool calling schemas for LLMs (`fill_form`, `spotlight`, `focus`) with OpenAI, Anthropic, and Gemini adapters.
  - `ActionValidator`: DOM target existence, interactive state verification, read-only/disabled constraints, and select option checks.
  - `FormStateManager`: Granular form snapshots, multi-level undo/redo stacks, and atomic rollback mechanism.
  - `ActionDispatcher`: Upgraded with `ActionResult`, error reporting, and integrated undo/redo/rollback.
  - 39 passing tests in Vitest / Happy-DOM (24 new tests).

- [x] **Milestone 3: React Integration & Dock UI (`@domsynapse/react`)** *(COMPLETED)*
  - `<DomSynapseProvider>` global context with live DOM observation, undo/redo state, and streaming action bridge.
  - Collapsible `<DomSynapseDock>` with real-time "What I See" screen context pill, quick suggestions chips, and chat.
  - `<SpotlightOverlay>` with animated element glow and instruction card.
  - `<DiffConfirmCard>` interactive before/after preview modal before autofilling.
  - Custom CSS theming with CSS variables and dual ESM + CJS + DTS builds.
  - 5 Vitest / Happy-DOM component tests (44 total workspace tests).

- [x] **Milestone 4: Backend Edge Handlers (`@domsynapse/server`)** *(COMPLETED)*
  - `DomSynapseHandler`: Provider proxy supporting OpenAI, Anthropic Claude, and Google Gemini with auto tool parsing.
  - Rate limiting, `onBeforeRequest` security interceptor, and live `PageContext` system prompt builder.
  - Framework adapters: `createDomSynapseNextHandler` (Next.js App Router), `createDomSynapseExpressHandler` (Express), and `createDomSynapseHonoHandler` (Hono).
  - 10 Vitest tests (54 total workspace tests) and full ESM + CJS + DTS bundle.

- [ ] **Milestone 5: Interactive Demo App & NPM Release**
  - Next.js demo testing multi-step forms and on-page copilot assist.
  - Changesets CI/CD workflow for automated NPM publishing.

---

## 5. Usage Example

```tsx
// 1. Wrap your app
import { DomSynapseProvider, DomSynapseDock } from '@domsynapse/react';
import '@domsynapse/react/styles.css';

export default function App() {
  return (
    <DomSynapseProvider
      apiEndpoint="/api/copilot"
      options={{
        autoObserveForms: true,
        piiMasking: true,
      }}
    >
      <MyApplication />
      
      {/* Floating dock that observes the active route & forms */}
      <DomSynapseDock position="bottom-right" />
    </DomSynapseProvider>
  );
}
```
