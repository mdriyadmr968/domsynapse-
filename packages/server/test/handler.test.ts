import { describe, it, expect, vi } from 'vitest';
import { DomSynapseHandler } from '../src/core/handler';

describe('DomSynapseHandler', () => {
  it('proxies OpenAI chat completions with tool calls', async () => {
    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: 'I have filled out your address details.',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'fill_form',
                  arguments: JSON.stringify({
                    fields: [
                      { selector: '#address', value: '123 Market St' },
                      { selector: '#city', value: 'San Francisco' },
                    ],
                  }),
                },
              },
            ],
          },
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOpenAIResponse,
    });

    const handler = new DomSynapseHandler({
      provider: 'openai',
      apiKey: 'test-sk-key',
      customFetch: mockFetch as any,
    });

    const res = await handler.handleRequest({
      message: 'Please autofill my address',
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(res.reply).toBe('I have filled out your address details.');
    expect(res.action).toBeDefined();
    expect(res.action?.type).toBe('fill_form');
    if (res.action?.type === 'fill_form') {
      expect(res.action.fields).toHaveLength(2);
      expect(res.action.fields[0].value).toBe('123 Market St');
    }
  });

  it('proxies Anthropic Claude messages with tool_use', async () => {
    const mockClaudeResponse = {
      content: [
        {
          type: 'tool_use',
          name: 'spotlight',
          input: {
            selector: 'button#checkout',
            message: 'Click this button to complete your purchase.',
          },
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockClaudeResponse,
    });

    const handler = new DomSynapseHandler({
      provider: 'anthropic',
      apiKey: 'test-anthropic-key',
      customFetch: mockFetch as any,
    });

    const res = await handler.handleRequest({
      message: 'Where do I submit?',
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(res.action).toBeDefined();
    expect(res.action?.type).toBe('spotlight');
    if (res.action?.type === 'spotlight') {
      expect(res.action.selector).toBe('button#checkout');
    }
  });

  it('enforces rate limits when configured', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });

    const handler = new DomSynapseHandler({
      provider: 'openai',
      apiKey: 'test-key',
      customFetch: mockFetch as any,
      rateLimit: { maxRequestsPerMinute: 2 },
    });

    // 1st request ok
    await handler.handleRequest({ message: '1' });
    // 2nd request ok
    await handler.handleRequest({ message: '2' });
    // 3rd request should reject
    await expect(handler.handleRequest({ message: '3' })).rejects.toThrow(
      'Rate limit exceeded'
    );
  });

  it('supports onBeforeRequest interceptor', async () => {
    const handler = new DomSynapseHandler({
      provider: 'openai',
      apiKey: 'test-key',
      onBeforeRequest: async (req) => {
        if (req.message.includes('forbidden')) {
          return false;
        }
      },
    });

    await expect(handler.handleRequest({ message: 'forbidden query' })).rejects.toThrow(
      'Request rejected by onBeforeRequest hook'
    );
  });
});
