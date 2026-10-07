# @domsynapse/core 🧠

> Framework-agnostic neural DOM observer, semantic serializer, PII shield, and action engine for AI web copilots.

[![npm version](https://img.shields.io/npm/v/@domsynapse/core.svg)](https://www.npmjs.com/package/@domsynapse/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

`@domsynapse/core` is the foundational JavaScript/TypeScript engine powering DomSynapse. It inspects web pages, compresses bloated HTML structures into token-efficient semantic markdown (~85% token reduction), masks sensitive personal data (PII) before LLM submission, and provides a multi-level undoable action execution dispatcher.

---

## Features

- **🌐 Zero Dependency & Framework-Agnostic**: Runs in any modern browser, Web Worker, or content script.
- **⚡ Token-Optimized Semantic Serializer**: Converts raw DOM elements into concise LLM-friendly schemas, stripping scripts, SVG paths, styles, and redundant DOM nodes.
- **🛡️ Built-in PII Shield**: Automatically masks credit cards, SSNs, passwords, email addresses, and phone numbers before sending context to AI models.
- **🎯 Precision Action Dispatcher**: Dispatches `fill_form`, `spotlight`, and `focus` actions with synthetic DOM events (`input`, `change`, `blur`) for reactive frameworks (React, Vue, Svelte, Angular).
- **↩️ Multi-Level History & Rollback**: Automatic undo/redo stack that tracks snapshot states across form interactions.
- **🔄 Cross-Tab Synchronization**: Zero-backend `BroadcastChannel` synchronization of copilot actions and spotlights across browser tabs.

---

## Installation

```bash
pnpm add @domsynapse/core
# or
npm install @domsynapse/core
# or
yarn add @domsynapse/core
```

---

## Quick Start

### 1. Observing the DOM & Serializing Context

```ts
import { DOMObserver } from '@domsynapse/core';

const observer = new DOMObserver({
  autoObserveForms: true,
  trackInputs: true,
  debounceMs: 250,
  piiOptions: {
    maskCreditCards: true,
    maskSSN: true,
    maskPasswords: true,
  },
});

// Subscribe to DOM and form state updates
const unsubscribe = observer.onContextChange((context) => {
  console.log('Observed Page Title:', context.title);
  console.log('Active Forms:', context.forms.length);

  // Format context for LLM prompt ingestion (~85% token savings)
  const markdownContext = observer.formatContextForLLM(context);
  console.log(markdownContext);
});

// Start observing mutations and user focus
observer.start();

// Cleanup when finished
// observer.stop();
// unsubscribe();
```

### 2. Validating & Executing AI Actions

```ts
import { ActionDispatcher, ActionValidator, DomSynapseAction } from '@domsynapse/core';

const dispatcher = new ActionDispatcher();
const validator = new ActionValidator();

// Action received from LLM
const proposedAction: DomSynapseAction = {
  type: 'fill_form',
  formSelector: '#checkout-form',
  fields: [
    { selector: '#billing-name', name: 'name', value: 'Alex Morgan' },
    { selector: '#billing-email', name: 'email', value: 'alex@example.com' },
  ],
};

// Validate action against strict schemas
const validation = validator.validate(proposedAction);
if (validation.isValid) {
  // Execute and record snapshot for undo/redo
  const result = dispatcher.execute(proposedAction);
  console.log(`Updated ${result.appliedCount} fields successfully.`);

  // Undo changes anytime
  // dispatcher.undo();
  // dispatcher.redo();
} else {
  console.error('Invalid action proposal:', validation.errors);
}
```

### 3. Cross-Tab Synchronization

```ts
import { CrossTabSync } from '@domsynapse/core';

const sync = new CrossTabSync('my_app_channel');

// Listen to events from other tabs
const unsubscribe = sync.subscribe((event) => {
  if (event.type === 'action_executed') {
    console.log('Action was executed in another tab:', event.payload?.action);
  }
});

// Broadcast action to all other open tabs
sync.broadcast('spotlight_triggered', {
  selector: '#login-button',
  message: 'Click here to sign in',
});
```

---

## API Reference

### `DOMObserver`
| Method | Description |
| :--- | :--- |
| `start()` | Starts observing DOM mutations, focus changes, and navigation events. |
| `stop()` | Disconnects mutation observer and removes window event listeners. |
| `captureNow()` | Synchronously inspects the DOM and returns the fresh `PageContext`. |
| `getContext()` | Returns current cached context or captures immediate context. |
| `onContextChange(cb)` | Subscribes to debounced DOM context updates. Returns unsubscribe function. |
| `formatContextForLLM(ctx?)` | Converts `PageContext` into token-optimized Markdown for LLMs. |

### `PIIShield`
| Method | Description |
| :--- | :--- |
| `mask(value, fieldType, fieldName)` | Applies rule-based masking (regex + attribute inspection). |
| `addRule(rule)` | Registers a custom masking rule pattern. |
| `isFieldSensitive(name, type, el)` | Checks if a DOM field contains sensitive identifiers or attributes. |

### `ActionDispatcher`
| Method | Description |
| :--- | :--- |
| `execute(action)` | Executes `fill_form`, `spotlight`, or `focus` action and records snapshot. |
| `undo()` | Reverts the last form mutation. Returns `boolean` success. |
| `redo()` | Re-applies the last reverted form mutation. Returns `boolean` success. |
| `canUndo()` / `canRedo()` | Checks history stack availability. |
| `focusElement(selector)` | Smoothly scrolls and focuses the target element. |
| `getSpotlightBounds(selector)` | Returns target element bounding rect for visual spotlights. |

---

## HTML Data Attributes

You can control DOM serialization directly in your HTML markup:

| Attribute | Behavior |
| :--- | :--- |
| `data-synapse-ignore` | Completely excludes this element and its subtree from LLM context. |
| `data-synapse-mask` | Forces PII masking on the field value regardless of field type. |
| `data-synapse-label="Custom"` | Overrides the detected field label for AI reasoning. |

---

## License

MIT © [DomSynapse Contributors](https://github.com/mdriyadmr968/domsynapse-)
