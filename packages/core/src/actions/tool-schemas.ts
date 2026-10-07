import { DomSynapseAction, FormFillAction, SpotlightAction, FocusAction, ToolDefinition } from '../types';

/**
 * Canonical tool schemas for DomSynapse actions
 */
export const DOMSYNAPSE_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  fill_form: {
    name: 'fill_form',
    description: 'Autofills or updates one or more input fields, checkboxes, or dropdowns in a form on the current page.',
    parameters: {
      type: 'object',
      properties: {
        formSelector: {
          type: 'string',
          description: 'Optional CSS selector of the parent form container (e.g. "#checkout-form").',
        },
        fields: {
          type: 'array',
          description: 'List of fields to fill or change.',
          items: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector of the input element (e.g. "#email", "input[name=city]").',
              },
              name: {
                type: 'string',
                description: 'HTML name attribute of the field (fallback if selector is omitted).',
              },
              value: {
                type: 'string',
                description: 'The value to fill into the field. For checkboxes, use "true", "false", or the option value.',
              },
              fieldLabel: {
                type: 'string',
                description: 'Human-readable label of the field for preview display.',
              },
            },
            required: ['value'],
          },
        },
      },
      required: ['fields'],
    },
  },

  spotlight: {
    name: 'spotlight',
    description: "Highlights a specific element on the page with an animated visual spotlight and provides an instructive guidance message.",
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element to spotlight (e.g. "button#submit-order", "nav.sidebar").',
        },
        message: {
          type: 'string',
          description: 'Helpful message explaining why this element is spotlighted or what action to take.',
        },
      },
      required: ['selector', 'message'],
    },
  },

  focus: {
    name: 'focus',
    description: 'Smoothly scrolls an element into view and focuses keyboard interaction onto it.',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the element to focus (e.g. "#billing-address-line1").',
        },
      },
      required: ['selector'],
    },
  },
};

/**
 * Returns tool definitions formatted for OpenAI Function Calling (tools API)
 */
export function getOpenAITools() {
  return Object.values(DOMSYNAPSE_TOOL_DEFINITIONS).map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Returns tool definitions formatted for Anthropic Claude Tools API
 */
export function getAnthropicTools() {
  return Object.values(DOMSYNAPSE_TOOL_DEFINITIONS).map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

/**
 * Returns tool definitions formatted for Google Gemini Function Calling
 */
export function getGeminiFunctionDeclarations() {
  return Object.values(DOMSYNAPSE_TOOL_DEFINITIONS).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

/**
 * Parses and validates an LLM tool call payload into a strongly-typed DomSynapseAction
 */
export function parseLLMToolCall(
  toolName: string,
  args: unknown
): { success: true; action: DomSynapseAction } | { success: false; error: string } {
  if (!toolName || typeof toolName !== 'string') {
    return { success: false, error: 'Missing or invalid tool name' };
  }

  let parsedArgs: Record<string, any>;
  if (typeof args === 'string') {
    try {
      parsedArgs = JSON.parse(args);
    } catch {
      return { success: false, error: `Failed to parse arguments JSON string: ${args}` };
    }
  } else if (typeof args === 'object' && args !== null) {
    parsedArgs = args as Record<string, any>;
  } else {
    return { success: false, error: 'Arguments must be a valid JSON object or string' };
  }

  switch (toolName) {
    case 'fill_form': {
      if (!parsedArgs.fields || !Array.isArray(parsedArgs.fields)) {
        return { success: false, error: 'fill_form requires an array of fields' };
      }

      if (parsedArgs.fields.length === 0) {
        return { success: false, error: 'fill_form fields array cannot be empty' };
      }

      for (const [idx, field] of parsedArgs.fields.entries()) {
        if (!field || typeof field !== 'object') {
          return { success: false, error: `Field at index ${idx} must be an object` };
        }
        if (field.value === undefined || field.value === null) {
          return { success: false, error: `Field at index ${idx} is missing required 'value'` };
        }
        if (!field.selector && !field.name) {
          return { success: false, error: `Field at index ${idx} must have either 'selector' or 'name'` };
        }
      }

      const action: FormFillAction = {
        type: 'fill_form',
        formSelector: parsedArgs.formSelector,
        fields: parsedArgs.fields.map((f: any) => ({
          selector: f.selector ? String(f.selector) : undefined,
          name: f.name ? String(f.name) : undefined,
          value: String(f.value),
          fieldLabel: f.fieldLabel ? String(f.fieldLabel) : undefined,
        })),
      };

      return { success: true, action };
    }

    case 'spotlight': {
      if (!parsedArgs.selector || typeof parsedArgs.selector !== 'string') {
        return { success: false, error: 'spotlight requires a string selector' };
      }
      if (!parsedArgs.message || typeof parsedArgs.message !== 'string') {
        return { success: false, error: 'spotlight requires a string message' };
      }

      const action: SpotlightAction = {
        type: 'spotlight',
        selector: parsedArgs.selector,
        message: parsedArgs.message,
      };

      return { success: true, action };
    }

    case 'focus': {
      if (!parsedArgs.selector || typeof parsedArgs.selector !== 'string') {
        return { success: false, error: 'focus requires a string selector' };
      }

      const action: FocusAction = {
        type: 'focus',
        selector: parsedArgs.selector,
      };

      return { success: true, action };
    }

    default:
      return { success: false, error: `Unknown tool name: ${toolName}` };
  }
}
