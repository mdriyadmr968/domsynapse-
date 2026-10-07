import {
  getOpenAITools,
  getAnthropicTools,
  getGeminiFunctionDeclarations,
  parseLLMToolCall,
} from '@domsynapse/core';
import {
  DomSynapseServerOptions,
  DomSynapseServerRequest,
  DomSynapseServerResponse,
} from '../types';
import { buildSystemPrompt } from './prompt';

class SimpleRateLimiter {
  private requests: number[] = [];
  private maxPerMinute: number;

  constructor(maxPerMinute = 60) {
    this.maxPerMinute = maxPerMinute;
  }

  public checkLimit(): boolean {
    const now = Date.now();
    const windowStart = now - 60000;
    this.requests = this.requests.filter((t) => t > windowStart);

    if (this.requests.length >= this.maxPerMinute) {
      return false;
    }

    this.requests.push(now);
    return true;
  }
}

export class DomSynapseHandler {
  private options: DomSynapseServerOptions;
  private rateLimiter?: SimpleRateLimiter;

  constructor(options: DomSynapseServerOptions = {}) {
    this.options = options;
    if (options.rateLimit?.maxRequestsPerMinute) {
      this.rateLimiter = new SimpleRateLimiter(options.rateLimit.maxRequestsPerMinute);
    }
  }

  /**
   * Processes a DomSynapse copilot request
   */
  public async handleRequest(
    payload: DomSynapseServerRequest
  ): Promise<DomSynapseServerResponse> {
    // 1. Rate limiting
    if (this.rateLimiter && !this.rateLimiter.checkLimit()) {
      throw new Error('Rate limit exceeded: too many requests in this time window');
    }

    // 2. Pre-request hook
    if (this.options.onBeforeRequest) {
      const allowed = await this.options.onBeforeRequest(payload);
      if (allowed === false) {
        throw new Error('Request rejected by onBeforeRequest hook');
      }
    }

    const provider = this.options.provider || 'openai';
    const fetchFn = this.options.customFetch || fetch;

    switch (provider) {
      case 'openai':
        return this.handleOpenAI(payload, fetchFn);
      case 'anthropic':
        return this.handleAnthropic(payload, fetchFn);
      case 'gemini':
        return this.handleGemini(payload, fetchFn);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  /**
   * Processes a DomSynapse copilot request and returns an SSE ReadableStream
   */
  public handleStreamRequest(
    payload: DomSynapseServerRequest
  ): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const self = this;

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const response = await self.handleRequest(payload);

          // Stream reply in text word fragments
          const words = response.reply.split(/(\s+)/);
          for (const word of words) {
            if (!word) continue;
            const chunk = {
              type: 'token',
              delta: word,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }

          // If an action was produced, stream action chunk
          if (response.action) {
            const actionChunk = {
              type: 'action',
              action: response.action,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(actionChunk)}\n\n`));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err: any) {
          const errorChunk = {
            type: 'error',
            error: err.message || 'Stream processing failed',
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
          controller.close();
        }
      },
    });
  }

  private async handleOpenAI(
    req: DomSynapseServerRequest,
    fetchFn: typeof fetch
  ): Promise<DomSynapseServerResponse> {
    let apiKey =
      this.options.apiKey ||
      (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : undefined);

    const baseURL = this.options.baseURL || 'https://api.openai.com/v1';

    if (!apiKey) {
      if (baseURL.includes('api.openai.com')) {
        throw new Error('Missing OpenAI API key. Set OPENAI_API_KEY in environment or pass apiKey option.');
      }
      apiKey = 'local-custom-provider';
    }
    const model = this.options.model || 'gpt-4o';
    const systemPrompt = buildSystemPrompt(req.pageContext, this.options.customInstructions);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(req.messages || []).map((m) => ({ role: m.role, content: m.content })),
    ];

    if (!req.messages || req.messages.length === 0 || req.messages[req.messages.length - 1].content !== req.message) {
      messages.push({ role: 'user', content: req.message });
    }

    const tools = getOpenAITools();

    const res = await fetchFn(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: 'auto',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const message = choice?.message;

    let reply = message?.content || '';
    let action: any = undefined;
    let tool_call: any = undefined;

    if (message?.tool_calls && message.tool_calls.length > 0) {
      const primaryTool = message.tool_calls[0];
      tool_call = {
        name: primaryTool.function.name,
        arguments: primaryTool.function.arguments,
      };

      const parsed = parseLLMToolCall(tool_call.name, tool_call.arguments);
      if (parsed.success) {
        action = parsed.action;
        if (!reply) {
          if (action.type === 'fill_form') {
            reply = 'I have prepared the form fill recommendations for you to review.';
          } else if (action.type === 'spotlight') {
            reply = action.message;
          }
        }
      }
    }

    return {
      reply,
      action,
      tool_call,
    };
  }

  private async handleAnthropic(
    req: DomSynapseServerRequest,
    fetchFn: typeof fetch
  ): Promise<DomSynapseServerResponse> {
    const apiKey =
      this.options.apiKey ||
      (typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : undefined);

    if (!apiKey) {
      throw new Error('Missing Anthropic API key. Set ANTHROPIC_API_KEY in environment or pass apiKey option.');
    }

    const baseURL = this.options.baseURL || 'https://api.anthropic.com/v1';
    const model = this.options.model || 'claude-3-5-sonnet-20241022';
    const systemPrompt = buildSystemPrompt(req.pageContext, this.options.customInstructions);

    const claudeTools = getAnthropicTools();

    const messages = (req.messages || []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    if (!req.messages || req.messages.length === 0 || req.messages[req.messages.length - 1].content !== req.message) {
      messages.push({ role: 'user', content: req.message });
    }

    const res = await fetchFn(`${baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages,
        tools: claudeTools,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    let reply = '';
    let action: any = undefined;
    let tool_call: any = undefined;

    for (const block of data.content || []) {
      if (block.type === 'text') {
        reply += block.text;
      } else if (block.type === 'tool_use') {
        tool_call = {
          name: block.name,
          arguments: block.input,
        };
        const parsed = parseLLMToolCall(tool_call.name, tool_call.arguments);
        if (parsed.success) {
          action = parsed.action;
        }
      }
    }

    return {
      reply,
      action,
      tool_call,
    };
  }

  private async handleGemini(
    req: DomSynapseServerRequest,
    fetchFn: typeof fetch
  ): Promise<DomSynapseServerResponse> {
    const apiKey =
      this.options.apiKey ||
      (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);

    if (!apiKey) {
      throw new Error('Missing Gemini API key. Set GEMINI_API_KEY in environment or pass apiKey option.');
    }

    const model = this.options.model || 'gemini-1.5-pro';
    const baseURL = this.options.baseURL || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const systemPrompt = buildSystemPrompt(req.pageContext, this.options.customInstructions);

    const functionDeclarations = getGeminiFunctionDeclarations();

    const contents = (req.messages || []).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (!req.messages || req.messages.length === 0 || req.messages[req.messages.length - 1].content !== req.message) {
      contents.push({ role: 'user', parts: [{ text: req.message }] });
    }

    const res = await fetchFn(`${baseURL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        tools: [{ functionDeclarations }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    let reply = '';
    let action: any = undefined;
    let tool_call: any = undefined;

    const candidate = data.candidates?.[0];
    for (const part of candidate?.content?.parts || []) {
      if (part.text) {
        reply += part.text;
      } else if (part.functionCall) {
        tool_call = {
          name: part.functionCall.name,
          arguments: part.functionCall.args,
        };
        const parsed = parseLLMToolCall(tool_call.name, tool_call.arguments);
        if (parsed.success) {
          action = parsed.action;
        }
      }
    }

    return {
      reply,
      action,
      tool_call,
    };
  }
}
