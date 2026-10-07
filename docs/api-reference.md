# DomSynapse API Reference 📖

Complete reference manual for `@domsynapse/core`, `@domsynapse/react`, and `@domsynapse/server`.

---

## 1. `@domsynapse/core`

### `DOMObserver`
Observer tracking active forms, input interactions, focus changes, and document mutations.

```ts
import { DOMObserver } from '@domsynapse/core';

const observer = new DOMObserver(options?: DOMObserverOptions);
```

#### Options (`DOMObserverOptions`)
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `root` | `Document \| HTMLElement` | `document` | Root node to observe. |
| `autoObserveForms` | `boolean` | `true` | Automatically attach listeners to all form controls. |
| `trackInputs` | `boolean` | `true` | Listen to input events for real-time value changes. |
| `trackFocus` | `boolean` | `true` | Track active focused element in context. |
| `debounceMs` | `number` | `200` | Debounce window before notifying listeners. |
| `piiOptions` | `PIIShieldOptions` | `{}` | Rules and settings for the PII masking shield. |
| `ignoreSelectors` | `string[]` | `[]` | CSS selectors completely ignored during serialization. |

#### Methods
- `start(): void`: Begins MutationObserver and event listeners.
- `stop(): void`: Disconnects observers and unregisters event listeners.
- `captureNow(): PageContext`: Synchronously serializes the current DOM state and notifies listeners.
- `getContext(): PageContext`: Returns cached context or executes immediate serialization.
- `onContextChange(callback: (ctx: PageContext) => void): () => void`: Subscribes to context changes.
- `formatContextForLLM(context?: PageContext): string`: Returns token-pruned markdown.

---

### `PIIShield`
Detects and redacts sensitive personally identifiable information.

```ts
import { PIIShield } from '@domsynapse/core';

const shield = new PIIShield(options?: PIIShieldOptions);
```

#### Options (`PIIShieldOptions`)
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `maskCreditCards` | `boolean` | `true` | Masks credit card numbers. |
| `maskSSN` | `boolean` | `true` | Masks Social Security numbers. |
| `maskPasswords` | `boolean` | `true` | Masks password field values. |
| `maskEmail` | `boolean` | `false` | Masks email addresses. |
| `maskPhone` | `boolean` | `false` | Masks telephone numbers. |
| `customRules` | `PIIRule[]` | `[]` | Custom regex patterns or evaluator functions. |

#### Methods
- `mask(value: string, fieldType?: string, fieldName?: string): string`: Returns sanitized string.
- `isFieldSensitive(name?: string, type?: string, el?: HTMLElement): boolean`: Evaluates whether an element should be redacted.
- `addRule(rule: PIIRule): void`: Appends a custom rule to the pipeline.

---

### `ActionDispatcher`
Executes AI-generated DOM mutations and manages the undo/redo stack.

```ts
import { ActionDispatcher } from '@domsynapse/core';

const dispatcher = new ActionDispatcher();
```

#### Methods
- `execute(action: DomSynapseAction): ActionResult`: Validates, records history, applies values to DOM, and triggers reactive events.
- `undo(): boolean`: Reverts the most recent form mutation.
- `redo(): boolean`: Reapplies the most recent reverted mutation.
- `canUndo(): boolean`: Returns `true` if previous states exist in history.
- `canRedo(): boolean`: Returns `true` if redo states exist in history.
- `clearHistory(): void`: Clears undo/redo stack.
- `focusElement(selector: string): boolean`: Scrolls and focuses target element.
- `getSpotlightBounds(selector: string): DOMRect | null`: Retrieves client bounding rect.

---

### `CrossTabSync`
Multi-tab synchronization using browser BroadcastChannel.

```ts
import { CrossTabSync } from '@domsynapse/core';

const sync = new CrossTabSync(channelName?: string);
```

#### Methods
- `broadcast(type: CrossTabEventType, payload?: any): void`: Transmits event to other open tabs.
- `subscribe(listener: (event: CrossTabEvent) => void): () => void`: Subscribes to events from other tabs.
- `close(): void`: Disconnects channel and cleans up listeners.
- `getInstanceId(): string`: Returns unique tab identifier.

---

## 2. `@domsynapse/react`

### `<DomSynapseProvider />`

Context provider orchestrating observer state, API requests, and user action approvals.

```tsx
<DomSynapseProvider
  apiEndpoint="/api/copilot"
  options={{
    autoObserveForms: true,
    enableCrossTabSync: true,
  }}
  onAction={async (action) => {
    // Return false to reject action
    return true;
  }}
>
  {children}
</DomSynapseProvider>
```

#### Props
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiEndpoint` | `string` | `undefined` | Backend API URL. |
| `options` | `DomSynapseOptions` | `{}` | Configuration for observer and sync. |
| `customFetch` | `typeof fetch` | `undefined` | Custom fetch handler. |
| `onAction` | `(action) => boolean \| Promise<boolean>` | `undefined` | Interceptor hook for AI action proposals. |

---

### `<DomSynapseDock />`

Pre-built floating copilot user interface dock.

```tsx
<DomSynapseDock
  position="bottom-right"
  title="AI Copilot"
  enableVoice={true}
  enableMinimize={true}
/>
```

#### Props
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Dock screen placement. |
| `title` | `string` | `'DomSynapse Copilot'` | Copilot header title. |
| `placeholder` | `string` | `'Ask AI Copilot...'` | Input placeholder. |
| `enableVoice` | `boolean` | `true` | Enables speech dictation button. |
| `enableMinimize` | `boolean` | `true` | Allows user to collapse dock. |
| `className` | `string` | `undefined` | Custom CSS class name. |

---

### `useDomSynapse()` Hook

Accesses copilot state and methods from any child component.

```tsx
const {
  pageContext,
  isObserving,
  messages,
  sendMessage,
  isLoading,
  error,
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
  clearMessages,
} = useDomSynapse();
```

---

## 3. `@domsynapse/server`

### Server Adapters

#### Next.js App Router (`createDomSynapseNextHandler`)
```ts
// app/api/copilot/route.ts
import { createDomSynapseNextHandler } from '@domsynapse/server';

export const POST = createDomSynapseNextHandler({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
  stream: true,
});
```

#### Express.js (`createDomSynapseExpressHandler`)
```ts
app.post('/api/copilot', createDomSynapseExpressHandler({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
}));
```

#### Hono (`createDomSynapseHonoHandler`)
```ts
app.post('/api/copilot', createDomSynapseHonoHandler({
  provider: 'gemini',
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-1.5-pro',
  stream: true,
}));
```

#### Handler Options (`DomSynapseServerOptions`)
| Option | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `provider` | `'openai' \| 'anthropic' \| 'gemini'` | Yes | AI model provider. |
| `apiKey` | `string` | Conditional | Provider API Key (optional if custom `baseURL` is set). |
| `model` | `string` | No | Model name override. |
| `baseURL` | `string` | No | Custom proxy or local endpoint (Ollama, vLLM). |
| `stream` | `boolean` | No | Enables Server-Sent Events (SSE) streaming. |
| `systemPromptAddition` | `string` | No | Appends extra domain instructions to the prompt. |
