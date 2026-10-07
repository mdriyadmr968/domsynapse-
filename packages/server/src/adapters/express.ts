import { DomSynapseHandler } from '../core/handler';
import { DomSynapseServerOptions } from '../types';

/**
 * Creates an Express router/route handler (app.post('/api/copilot', createDomSynapseExpressHandler()))
 */
export function createDomSynapseExpressHandler(options: DomSynapseServerOptions = {}) {
  const handler = new DomSynapseHandler(options);

  return async function expressHandler(req: any, res: any) {
    try {
      const response = await handler.handleRequest(req.body);
      return res.status(200).json(response);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  };
}
