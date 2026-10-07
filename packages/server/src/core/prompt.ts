import { PageContext, SemanticSerializer } from '@domsynapse/core';

export const BASE_SYSTEM_PROMPT = `You are DomSynapse, an intelligent context-aware in-app AI copilot.
You have direct real-time vision into the host application's active page, form inputs, validation states, and focused elements.

GUIDELINES:
1. Provide concise, helpful, and direct answers about the active interface.
2. If the user asks you to fill out or assist with a form, ALWAYS invoke the 'fill_form' tool with the exact selectors/names and proposed values.
3. If the user asks where an element or button is, invoke the 'spotlight' tool with the element's CSS selector and a helpful guidance message.
4. If the user asks to jump to or focus an input, invoke the 'focus' tool.
5. Respect user privacy. Never hallucinate sensitive credentials.`;

/**
 * Builds the full LLM system prompt integrating real-time PageContext
 */
export function buildSystemPrompt(
  pageContext?: PageContext,
  customInstructions?: string
): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (customInstructions) {
    prompt += `\n\nADDITIONAL HOST APPLICATION INSTRUCTIONS:\n${customInstructions}`;
  }

  if (pageContext) {
    const serializer = new SemanticSerializer();
    const formattedDOM = serializer.formatForLLM(pageContext);

    prompt += `\n\n=== LIVE SCREEN CONTEXT ===\n${formattedDOM}\n=== END SCREEN CONTEXT ===`;
  }

  return prompt;
}
