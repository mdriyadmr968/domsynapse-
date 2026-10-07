import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, BASE_SYSTEM_PROMPT } from '../src/core/prompt';
import { PageContext } from '@domsynapse/core';

describe('buildSystemPrompt', () => {
  it('returns base system prompt when no context is provided', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('You are DomSynapse');
    expect(prompt).toContain('fill_form');
  });

  it('appends custom instructions when provided', () => {
    const prompt = buildSystemPrompt(undefined, 'Only speak in French.');
    expect(prompt).toContain('Only speak in French.');
  });

  it('formats page context into prompt', () => {
    const sampleContext: PageContext = {
      url: 'https://example.com/checkout',
      path: '/checkout',
      title: 'Checkout Page',
      headings: [{ level: 1, text: 'Billing Details' }],
      landmarks: [{ role: 'main', selector: 'main' }],
      forms: [
        {
          name: 'billing-form',
          selector: 'form#billing',
          fields: [
            {
              selector: '#card-number',
              name: 'card',
              type: 'text',
              label: 'Credit Card',
              required: true,
              disabled: false,
              readOnly: false,
            },
          ],
        },
      ],
      timestamp: Date.now(),
    };

    const prompt = buildSystemPrompt(sampleContext);
    expect(prompt).toContain('Checkout Page');
    expect(prompt).toContain('Billing Details');
    expect(prompt).toContain('Credit Card');
  });
});
