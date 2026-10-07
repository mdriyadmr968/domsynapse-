# @domsynapse/server 🚀

> Backend Edge handlers, SSE streaming bridge, and multi-provider LLM proxies for DomSynapse.

[![npm version](https://img.shields.io/npm/v/@domsynapse/server.svg)](https://www.npmjs.com/package/@domsynapse/server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

`@domsynapse/server` provides drop-in server handlers for Next.js App Router, Express, and Hono. It receives sanitized DOM contexts from `@domsynapse/react` or `@domsynapse/extension`, formats system instructions with tool schemas (`fill_form`, `spotlight`, `focus`), queries your chosen AI model (OpenAI, Anthropic Claude, or Google Gemini), and returns actions via standard JSON or Server-Sent Events (SSE) token streaming.

---

## Features

- **🤖 Multi-Provider LLM Support**: Built-in support for OpenAI (`gpt-4o`, `gpt-4o-mini`), Anthropic Claude (`claude-3-5-sonnet-20241022`), and Google Gemini (`gemini-1.5-pro`, `gemini-1.5-flash`).
- **⚡ Drop-In Framework Adapters**: One-line integration for Next.js App Router, Express.js, and Hono (Cloudflare Workers / Deno / Node).
- **🌊 Server-Sent Events (SSE) Streaming**: Token-by-token streaming with real-time tool action chunk emission for instant responses.
- **🔒 Self-Hosted & Local AI Ready**: Support for custom `baseURL` (Ollama, LM Studio, vLLM, Groq, LiteLLM) without requiring commercial API keys.
- **🛡️ Secure Edge Execution**: No state stored on the server; edge runtime compliant (Vercel Edge, Cloudflare Workers).

---

## Installation

```bash
pnpm add @domsynapse/server @domsynapse/core
# or
npm install @domsynapse/server @domsynapse/core
```

---

## Usage

### 1. Next.js 14/15 App Router

```ts
// app/api/copilot/route.ts
import { createDomSynapseNextHandler } from '@domsynapse/server';

export const POST = createDomSynapseNextHandler({
  provider: 'openai', // 'openai' | 'anthropic' | 'gemini'
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
  stream: true, // Enable SSE token streaming
  systemPromptAddition: 'Always be concise and helpful when completing user registration forms.',
});
```

### 2. Express.js

```ts
// server.ts
import express from 'express';
import { createDomSynapseExpressHandler } from '@domsynapse/server';

const app = express();
app.use(express.json());

app.post(
  '/api/copilot',
  createDomSynapseExpressHandler({
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
  })
);

app.listen(3001, () => {
  console.log('Copilot API running on http://localhost:3001');
});
```

### 3. Hono (Cloudflare Workers / Bun / Deno)

```ts
// src/index.ts
import { Hono } from 'hono';
import { createDomSynapseHonoHandler } from '@domsynapse/server';

const app = new Hono();

app.post(
  '/api/copilot',
  createDomSynapseHonoHandler({
    provider: 'gemini',
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-1.5-pro',
    stream: true,
  })
);

export default app;
```

### 4. Self-Hosted & Local AI (Ollama / vLLM / Groq)

```ts
// app/api/copilot/route.ts
import { createDomSynapseNextHandler } from '@domsynapse/server';

export const POST = createDomSynapseNextHandler({
  provider: 'openai',
  baseURL: 'http://localhost:11434/v1', // Local Ollama endpoint
  model: 'llama3:latest',
  // apiKey is optional when using a custom baseURL
});
```

---

## Configuration Options

```ts
export interface DomSynapseServerOptions {
  /** LLM Provider to route copilot reasoning to */
  provider: 'openai' | 'anthropic' | 'gemini';

  /** API Key for provider (optional when baseURL points to local service) */
  apiKey?: string;

  /** Target model identifier */
  model?: string;

  /** Optional custom API baseURL (e.g. for proxy, Ollama, or vLLM) */
  baseURL?: string;

  /** Enable token-by-token Server-Sent Events (SSE) streaming */
  stream?: boolean;

  /** Custom system instructions to append to the copilot prompt */
  systemPromptAddition?: string;

  /** Custom fetch implementation */
  fetchFn?: typeof fetch;
}
```

---

## Streaming Protocol (SSE)

When `stream: true` is enabled, the handler responds with `Content-Type: text/event-stream`. Events are emitted line-by-line:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"type": "token", "delta": "I have "}

data: {"type": "token", "delta": "prepared the form fill."}

data: {"type": "action", "action": {"type": "fill_form", "fields": [{"selector": "#name", "value": "Alex"}]}}

data: [DONE]
```

Client libraries (`@domsynapse/react` and `@domsynapse/extension`) consume this format automatically.

---

## License

MIT © [DomSynapse Contributors](https://github.com/mdriyadmr968/domsynapse-)
