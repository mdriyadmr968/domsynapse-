import { PageContext, DomSynapseAction } from '@domsynapse/core';

export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'custom';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface DomSynapseServerRequest {
  message: string;
  pageContext?: PageContext;
  messages?: ChatMessage[];
}

export interface DomSynapseServerResponse {
  reply: string;
  action?: DomSynapseAction;
  tool_call?: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface StreamChunk {
  type: 'token' | 'action' | 'done' | 'error';
  delta?: string;
  action?: DomSynapseAction;
  error?: string;
}

export interface DomSynapseServerOptions {
  /**
   * LLM provider ('openai', 'anthropic', 'gemini', 'custom')
   * Default: 'openai'
   */
  provider?: LLMProvider;
  /**
   * API Key for the chosen provider.
   * If omitted, reads from process.env (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY).
   */
  apiKey?: string;
  /**
   * LLM Model name to invoke (e.g. 'gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro')
   */
  model?: string;
  /**
   * Base URL for the LLM API if using a proxy or alternate endpoint
   */
  baseURL?: string;
  /**
   * Whether to stream responses using Server-Sent Events (SSE)
   */
  stream?: boolean;
  /**
   * Additional custom system instructions to append
   */
  customInstructions?: string;
  /**
   * Rate limiting options
   */
  rateLimit?: {
    maxRequestsPerMinute?: number;
  };
  /**
   * Custom fetch implementation for testing or enterprise proxies
   */
  customFetch?: typeof fetch;
  /**
   * Pre-request hook for authentication or logging. Return false to reject.
   */
  onBeforeRequest?: (req: DomSynapseServerRequest) => boolean | void | Promise<boolean | void>;
}
