import { DomSynapseHandler } from '../core/handler';
import { DomSynapseServerOptions } from '../types';

/**
 * Creates a Hono route handler (app.post('/api/copilot', createDomSynapseHonoHandler()))
 */
export function createDomSynapseHonoHandler(options: DomSynapseServerOptions = {}) {
  const handler = new DomSynapseHandler(options);

  return async function honoHandler(c: any) {
    try {
      const body = await c.req.json();
      const response = await handler.handleRequest(body);
      return c.json(response);
    } catch (err: any) {
      return c.json({ error: err.message || 'Internal Server Error' }, 500);
    }
  };
}
