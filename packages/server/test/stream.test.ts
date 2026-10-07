import { describe, it, expect, vi } from 'vitest';
import { DomSynapseHandler } from '../src/core/handler';
import { createDomSynapseNextHandler } from '../src/adapters/next';

describe('Server SSE Streaming', () => {
  it('handles stream request and emits SSE token and action chunks', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: 'Hello from stream',
            tool_calls: [
              {
                id: 'call_spotlight',
                type: 'function',
                function: {
                  name: 'spotlight',
                  arguments: JSON.stringify({
                    selector: '#test-btn',
                    message: 'Look here',
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
      json: async () => mockResponse,
    });

    const handler = new DomSynapseHandler({
      provider: 'openai',
      apiKey: 'test-key',
      customFetch: mockFetch as any,
    });

    const stream = handler.handleStreamRequest({
      message: 'Show me the button',
    });

    expect(stream).toBeInstanceOf(ReadableStream);

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let text = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }

    expect(text).toContain('data: {"type":"token"');
    expect(text).toContain('Hello');
    expect(text).toContain('from');
    expect(text).toContain('data: {"type":"action"');
    expect(text).toContain('#test-btn');
    expect(text).toContain('data: [DONE]');
  });

  it('Next.js route handler streams SSE when requested', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'Streaming route response' } }],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const nextHandler = createDomSynapseNextHandler({
      provider: 'openai',
      apiKey: 'test-key',
      stream: true,
      customFetch: mockFetch as any,
    });

    const req = new Request('https://example.com/api/copilot', {
      method: 'POST',
      body: JSON.stringify({ message: 'Stream this' }),
    });

    const res = await nextHandler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const reader = res.body?.getReader();
    expect(reader).toBeDefined();
    if (reader) {
      const { value } = await reader.read();
      const chunkText = new TextDecoder().decode(value);
      expect(chunkText).toContain('data: {"type":"token"');
    }
  });
});
