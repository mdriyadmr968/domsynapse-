import { DomSynapseHandler } from '../core/handler';
import { DomSynapseServerOptions } from '../types';

/**
 * Creates a Hono route handler (app.post('/api/copilot', createDomSynapseHonoHandler()))
 */
export function createDomSynapseHonoHandler(options: DomSynapseServerOptions = {}) {
  const handler = new DomSynapseHandler(options);

  return async function honoHandler(c: any) {
    try {
      const isStream =
        options.stream ||
        c.req.header?.('accept')?.includes('text/event-stream') ||
        c.req.header?.('x-domsynapse-stream') === 'true';

      const body = await c.req.json();

      if (isStream) {
        const stream = handler.handleStreamRequest(body);
        if (typeof c.body === 'function') {
          return c.body(stream, 200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          });
        }
        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        });
      }

      const response = await handler.handleRequest(body);
      return c.json(response);
    } catch (err: any) {
      return c.json({ error: err.message || 'Internal Server Error' }, 500);
    }
  };
}
