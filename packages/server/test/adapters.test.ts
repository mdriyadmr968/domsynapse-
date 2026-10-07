import { describe, it, expect, vi } from 'vitest';
import { createDomSynapseNextHandler } from '../src/adapters/next';
import { createDomSynapseExpressHandler } from '../src/adapters/express';
import { createDomSynapseHonoHandler } from '../src/adapters/hono';

describe('Server Framework Adapters', () => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Adapter response' } }],
    }),
  });

  const commonOptions = {
    provider: 'openai' as const,
    apiKey: 'dummy-key',
    customFetch: mockFetch as any,
  };

  it('Next.js route handler returns JSON response', async () => {
    const handler = createDomSynapseNextHandler(commonOptions);
    const req = new Request('https://example.com/api/copilot', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello Next.js' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBe('Adapter response');
  });

  it('Express middleware handler calls res.status(200).json(...)', async () => {
    const middleware = createDomSynapseExpressHandler(commonOptions);
    const req = { body: { message: 'Hello Express' } };
    const jsonSpy = vi.fn();
    const res = {
      status: vi.fn().mockReturnValue({ json: jsonSpy }),
    };

    await middleware(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ reply: 'Adapter response' })
    );
  });

  it('Hono route handler calls c.json(...)', async () => {
    const honoHandler = createDomSynapseHonoHandler(commonOptions);
    const c = {
      req: {
        json: async () => ({ message: 'Hello Hono' }),
      },
      json: vi.fn().mockImplementation((data) => data),
    };

    await honoHandler(c);
    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({ reply: 'Adapter response' })
    );
  });
});
