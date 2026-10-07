import { DomSynapseHandler } from '../core/handler';
import { DomSynapseServerOptions } from '../types';

/**
 * Creates a route handler for Next.js App Router (app/api/copilot/route.ts)
 *
 * Example:
 * ```ts
 * export const POST = createDomSynapseNextHandler({ provider: 'openai' });
 * ```
 */
export function createDomSynapseNextHandler(options: DomSynapseServerOptions = {}) {
  const handler = new DomSynapseHandler(options);

  return async function POST(request: Request) {
    try {
      const body = await request.json();
      const response = await handler.handleRequest(body);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message || 'Internal Server Error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}
