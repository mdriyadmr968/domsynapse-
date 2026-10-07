import { describe, it, expect } from 'vitest';
import {
  DOMSYNAPSE_TOOL_DEFINITIONS,
  getOpenAITools,
  getAnthropicTools,
  getGeminiFunctionDeclarations,
  parseLLMToolCall,
} from '../src/actions/tool-schemas';

describe('Tool Schemas & LLM Tool Engine', () => {
  it('exposes standard tool definitions for fill_form, spotlight, and focus', () => {
    expect(DOMSYNAPSE_TOOL_DEFINITIONS.fill_form).toBeDefined();
    expect(DOMSYNAPSE_TOOL_DEFINITIONS.spotlight).toBeDefined();
    expect(DOMSYNAPSE_TOOL_DEFINITIONS.focus).toBeDefined();
  });

  it('formats tools correctly for OpenAI Function Calling', () => {
    const openAITools = getOpenAITools();
    expect(openAITools).toHaveLength(3);
    const fillForm = openAITools.find((t) => t.function.name === 'fill_form');
    expect(fillForm).toBeDefined();
    expect(fillForm?.type).toBe('function');
    expect(fillForm?.function.parameters.type).toBe('object');
  });

  it('formats tools correctly for Anthropic Claude Tools', () => {
    const claudeTools = getAnthropicTools();
    expect(claudeTools).toHaveLength(3);
    const spotlight = claudeTools.find((t) => t.name === 'spotlight');
    expect(spotlight).toBeDefined();
    expect(spotlight?.input_schema).toBeDefined();
  });

  it('formats tools correctly for Google Gemini Function Declarations', () => {
    const geminiTools = getGeminiFunctionDeclarations();
    expect(geminiTools).toHaveLength(3);
    const focusTool = geminiTools.find((t) => t.name === 'focus');
    expect(focusTool).toBeDefined();
    expect(focusTool?.parameters).toBeDefined();
  });

  describe('parseLLMToolCall', () => {
    it('parses valid fill_form tool call from JSON string', () => {
      const rawJson = JSON.stringify({
        fields: [
          { selector: '#email', value: 'user@example.com' },
          { name: 'newsletter', value: 'true' },
        ],
      });

      const res = parseLLMToolCall('fill_form', rawJson);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.action.type).toBe('fill_form');
        expect(res.action.fields).toHaveLength(2);
        expect(res.action.fields[0].value).toBe('user@example.com');
      }
    });

    it('parses valid fill_form tool call from object arguments', () => {
      const args = {
        fields: [{ selector: '#name', value: 'John Doe', fieldLabel: 'Full Name' }],
      };

      const res = parseLLMToolCall('fill_form', args);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.action.type).toBe('fill_form');
        expect(res.action.fields[0].fieldLabel).toBe('Full Name');
      }
    });

    it('parses valid spotlight tool call', () => {
      const res = parseLLMToolCall('spotlight', {
        selector: '#checkout-btn',
        message: 'Click here to place your order',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.action.type).toBe('spotlight');
        expect(res.action.selector).toBe('#checkout-btn');
      }
    });

    it('parses valid focus tool call', () => {
      const res = parseLLMToolCall('focus', { selector: '#search-bar' });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.action.type).toBe('focus');
        expect(res.action.selector).toBe('#search-bar');
      }
    });

    it('rejects invalid JSON string arguments', () => {
      const res = parseLLMToolCall('fill_form', '{ invalid json');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('Failed to parse arguments');
      }
    });

    it('rejects missing or empty fields for fill_form', () => {
      const emptyRes = parseLLMToolCall('fill_form', { fields: [] });
      expect(emptyRes.success).toBe(false);

      const noFieldsRes = parseLLMToolCall('fill_form', {});
      expect(noFieldsRes.success).toBe(false);
    });

    it('rejects field missing both selector and name', () => {
      const res = parseLLMToolCall('fill_form', {
        fields: [{ value: 'some value' }],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('must have either');
      }
    });

    it('rejects unknown tool names', () => {
      const res = parseLLMToolCall('unknown_action', {});
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('Unknown tool name');
      }
    });
  });
});
