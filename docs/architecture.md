# DomSynapse Architecture 🏛️

This document details the architectural design, data pipelines, and state machines underlying the DomSynapse copilot ecosystem.

---

## 1. System High-Level Topology

```mermaid
flowchart TD
    subgraph Browser ["Client Web Browser"]
        DOM["HTML DOM & Form Elements"] --> Observer["DOMObserver (@domsynapse/core)"]
        Observer --> Serializer["SemanticSerializer"]
        Serializer --> PIIShield["PIIShield (Masking)"]
        PIIShield --> Context["PageContext & Markdown Context"]
        
        Context --> ReactContext["DomSynapseProvider (@domsynapse/react)"]
        ReactContext --> Dock["DomSynapseDock UI"]
        Dock --> User["User (Prompt / Voice)"]
        
        Dispatcher["ActionDispatcher"] --> DOM
        Sync["CrossTabSync (BroadcastChannel)"] <--> ReactContext
    end

    subgraph Edge ["Edge / Backend Server (@domsynapse/server)"]
        Adapter["Next.js / Express / Hono Adapter"]
        PromptBuilder["System Prompt & Tool Schemas"]
        LLMHandler["DomSynapseHandler (SSE Stream)"]
    end

    subgraph AIProviders ["AI Providers"]
        OpenAI["OpenAI (GPT-4o)"]
        Anthropic["Anthropic (Claude 3.5)"]
        Gemini["Google (Gemini 1.5)"]
    end

    ReactContext -- "POST Context + Query (SSE)" --> Adapter
    Adapter --> PromptBuilder
    PromptBuilder --> LLMHandler
    LLMHandler <--> OpenAI
    LLMHandler <--> Anthropic
    LLMHandler <--> Gemini
    LLMHandler -- "SSE Tokens & Actions Stream" --> ReactContext
    ReactContext -- "Human Approval" --> Dispatcher
```

---

## 2. Token Pruning & Semantic Serialization

Raw HTML documents typically contain hundreds of kilobytes of boilerplate: SVG paths, layout divs, style tags, script elements, inline attributes, and deeply nested wrappers. Passing raw HTML directly to an LLM produces:
1. Massive token consumption (high API latency and cost).
2. Context window saturation.
3. Hallucination on irrelevant visual nodes.

### Pruning Pipeline

```mermaid
flowchart LR
    RawHTML["Raw Document"] --> Filter["Strip &lt;script&gt;, &lt;style&gt;, &lt;svg&gt;"]
    Filter --> FormExtract["Extract Interactive Controls (&lt;input&gt;, &lt;select&gt;, &lt;button&gt;)"]
    FormExtract --> LabelDetect["Heuristic Label Binding (aria-label, &lt;label for&gt;, parent text)"]
    LabelDetect --> PIIRedact["Apply PII Shield Masking"]
    PIIRedact --> MarkdownTree["Generate Compact Markdown Tree"]
```

### Compression Benchmark
- Typical Onboarding Page Raw HTML: **~4,200 tokens**
- DomSynapse Semantic Markdown: **~350 tokens**
- **Token Efficiency Gain**: **~91.6% reduction**

---

## 3. PII Masking Shield

The PII Shield sanitizes sensitive end-user inputs before page state is transmitted across the wire.

### Built-in Masking Rules
- **Credit Cards**: Matches Visa, MasterCard, Amex, Discover Luhn-compliant digits (`****-****-****-1234`).
- **Social Security Numbers (SSN)**: Matches `***-**-6789`.
- **Passwords**: Matches `type="password"` inputs (`[REDACTED_PASSWORD]`).
- **Email & Phone**: Regex-based masking with preservation of domain structure (`a***@example.com`).

### Developer Overrides
Developers can annotate elements directly in HTML:
- `data-synapse-mask`: Unconditionally forces PII masking on the element.
- `data-synapse-ignore`: Completely removes the element and all child nodes from LLM awareness.

---

## 4. Multi-Level Undo / Redo State Machine

The `ActionDispatcher` and `FormStateManager` maintain an immutable history snapshot tree:

```mermaid
stateDiagram-v2
    [*] --> Idle: Initial Page Load
    Idle --> Staged: LLM Proposes Action
    Staged --> Idle: User Rejects Action
    Staged --> Applied: User Approves Action
    
    state Applied {
        [*] --> RecordSnapshot
        RecordSnapshot --> MutateDOM
        MutateDOM --> FireEvents: input, change, blur
    }
    
    Applied --> UndoAvailable: Saved to History Stack
    UndoAvailable --> RollbackState: User Clicks Undo
    RollbackState --> UndoAvailable: State Restored
```

### Event Simulation for Reactive Frameworks
Modern frontend frameworks like React, Vue, Svelte, and Angular bind form controls to internal state trackers (e.g., React's SyntheticEvent system and `_valueTracker`). Simply setting `element.value = 'x'` does not notify the framework.

DomSynapse bypasses this limitation by:
1. Accessing native prototype property setters:
   ```ts
   const valueSetter = Object.getOwnPropertyDescriptor(
     window.HTMLInputElement.prototype, 'value'
   )?.set;
   valueSetter?.call(element, newValue);
   ```
2. Dispatching sequential synthetic events:
   ```ts
   element.dispatchEvent(new Event('input', { bubbles: true }));
   element.dispatchEvent(new Event('change', { bubbles: true }));
   element.dispatchEvent(new Event('blur', { bubbles: true }));
   ```

---

## 5. Server-Sent Events (SSE) Streaming Protocol

To minimize perceived latency, DomSynapse streams tokens incrementally from the LLM to the client while simultaneously parsing tool call events:

```mermaid
sequenceDiagram
    participant Client as React / Extension
    participant Edge as @domsynapse/server
    participant LLM as AI Provider

    Client->>Edge: POST /api/copilot { message, pageContext }
    Edge->>LLM: Stream completion with tool definitions
    loop Token Streaming
        LLM-->>Edge: Token chunk
        Edge-->>Client: data: {"type":"token", "delta":"..."}\n\n
    end
    LLM-->>Edge: Tool Call (fill_form)
    Edge-->>Client: data: {"type":"action", "action":{...}}\n\n
    Edge-->>Client: data: [DONE]\n\n
    Client->>Client: Open Diff Confirmation Modal
```

---

## 6. Cross-Tab Synchronization

DomSynapse coordinates across multiple browser tabs using `BroadcastChannel`:
- **Channel**: `domsynapse_sync_channel`
- **Events**:
  - `action_executed`: Notifies other tabs that a form action was completed.
  - `history_changed`: Synchronizes `canUndo` / `canRedo` state across tabs.
  - `spotlight_triggered` / `spotlight_dismissed`: Coordinates visual cues when navigating between views.
- **Fail-Safe**: Gracefully degrades in environments where `BroadcastChannel` is unsupported or restricted by sandbox permissions.
