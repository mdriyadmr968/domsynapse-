# @domsynapse/react ⚛️

> React integration, context provider, collapsible dock, spotlight overlay, diff review modal, and voice-to-action for DomSynapse.

[![npm version](https://img.shields.io/npm/v/@domsynapse/react.svg)](https://www.npmjs.com/package/@domsynapse/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

`@domsynapse/react` provides turnkey React components and hooks to embed an intelligent in-app AI copilot into any React or Next.js application.

---

## Features

- **🧩 `<DomSynapseProvider />`**: Global context orchestrating DOM observers, server API calls, action approvals, and undo/redo history.
- **🚀 `<DomSynapseDock />`**: Floating, collapsible AI copilot dock with chat thread, quick action chips, history undo/redo buttons, and voice input.
- **🎙️ Voice-to-Action Dictation**: Built-in Web Speech API integration allowing users to dictate prompts and commands hands-free.
- **🌊 Token-by-Token SSE Streaming**: Real-time streaming response accumulation with live action chunk staging.
- **🔍 Diff Review Card (`<DiffConfirmCard />`)**: Clean visual modal allowing users to inspect proposed form changes before applying them.
- **🎯 Visual Spotlight (`<SpotlightOverlay />`)**: Highlights target interface elements with focused cutouts and guidance cards.
- **🔄 Cross-Tab Synchronization**: Automatically synchronizes actions and spotlights across browser tabs.

---

## Installation

```bash
pnpm add @domsynapse/react @domsynapse/core
# or
npm install @domsynapse/react @domsynapse/core
# or
yarn add @domsynapse/react @domsynapse/core
```

---

## Quick Start

### 1. Wrap your application with `DomSynapseProvider`

```tsx
// app/layout.tsx or src/App.tsx
import React from 'react';
import { DomSynapseProvider, DomSynapseDock } from '@domsynapse/react';
import '@domsynapse/react/styles.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DomSynapseProvider
          apiEndpoint="/api/copilot"
          options={{
            autoObserveForms: true,
            trackInputs: true,
            trackFocus: true,
            enableCrossTabSync: true,
            piiOptions: {
              maskCreditCards: true,
              maskSSN: true,
              maskPasswords: true,
            },
          }}
          onAction={async (action) => {
            console.log('Action proposed by AI:', action);
            // Return false to block an action programmatically
            return true;
          }}
        >
          {children}

          {/* Floating copilot dock */}
          <DomSynapseDock
            position="bottom-right"
            title="AI Copilot"
            placeholder="Ask AI to autofill or explain..."
            enableVoice={true}
          />
        </DomSynapseProvider>
      </body>
    </html>
  );
}
```

---

## Custom Copilot UI with `useDomSynapse`

If you want to build your own custom copilot interface instead of using `<DomSynapseDock />`, use the `useDomSynapse` hook:

```tsx
import React, { useState } from 'react';
import { useDomSynapse, DiffConfirmCard, SpotlightOverlay } from '@domsynapse/react';

export function CustomCopilot() {
  const {
    pageContext,
    messages,
    sendMessage,
    isLoading,
    canUndo,
    canRedo,
    undo,
    redo,
    spotlight,
    dismissSpotlight,
    pendingAction,
    pendingDiffChanges,
    approvePendingAction,
    rejectPendingAction,
  } = useDomSynapse();

  const [prompt, setPrompt] = useState('');

  return (
    <div className="custom-copilot">
      <h3>Active Page: {pageContext?.title}</h3>
      <p>Observed Forms: {pageContext?.forms.length}</p>

      {/* Undo / Redo controls */}
      <button onClick={() => undo()} disabled={!canUndo}>Undo</button>
      <button onClick={() => redo()} disabled={!canRedo}>Redo</button>

      {/* Message list */}
      <div className="chat">
        {messages.map((m) => (
          <div key={m.id} className={m.role}>
            {m.content}
          </div>
        ))}
      </div>

      {/* Prompt input */}
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Type instruction..."
      />
      <button onClick={() => { sendMessage(prompt); setPrompt(''); }}>Send</button>

      {/* Diff Confirmation Card */}
      {pendingAction && (
        <DiffConfirmCard
          action={pendingAction}
          diffs={pendingDiffChanges}
          onApprove={approvePendingAction}
          onReject={rejectPendingAction}
        />
      )}

      {/* Spotlight Overlay */}
      {spotlight && (
        <SpotlightOverlay
          spotlight={spotlight}
          onDismiss={dismissSpotlight}
        />
      )}
    </div>
  );
}
```

---

## Component Props

### `<DomSynapseProvider />`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiEndpoint` | `string` | `undefined` | Backend API URL handling copilot requests. If omitted, local mock is used. |
| `options` | `DomSynapseOptions` | `{}` | Observer, PII masking, and cross-tab sync configurations. |
| `customFetch` | `typeof fetch` | `undefined` | Custom fetch implementation (useful for auth headers or testing). |
| `onAction` | `(action) => boolean \| Promise<boolean>` | `undefined` | Interceptor callback before any proposed action is staged. |

### `<DomSynapseDock />`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Dock anchor corner on the screen. |
| `title` | `string` | `'DomSynapse Copilot'` | Header title for the copilot window. |
| `placeholder` | `string` | `'Ask AI Copilot to autofill, explain...'` | Placeholder text for prompt input. |
| `enableVoice` | `boolean` | `true` | Enables speech recognition microphone button. |
| `enableMinimize` | `boolean` | `true` | Allows user to collapse dock into a floating badge. |
| `className` | `string` | `undefined` | Custom CSS class name for root dock container. |

---

## Styling & Custom Themes

`@domsynapse/react` includes standard styles matching modern UI conventions:

```tsx
import '@domsynapse/react/styles.css';
```

You can customize the appearance by overriding CSS custom properties in your stylesheet:

```css
:root {
  --ds-primary: #4f46e5;
  --ds-primary-hover: #4338ca;
  --ds-bg: #ffffff;
  --ds-text: #0f172a;
  --ds-border: #e2e8f0;
  --ds-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}
```

---

## License

MIT © [DomSynapse Contributors](https://github.com/mdriyadmr968/domsynapse-)
