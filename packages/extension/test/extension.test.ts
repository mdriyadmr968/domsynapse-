import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DomSynapseExtensionCopilot } from '../src/content';

describe('DomSynapseExtensionCopilot', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="test-form">
        <label for="name">Full Name</label>
        <input type="text" id="name" name="name" value="" />
        <label for="email">Email</label>
        <input type="email" id="email" name="email" value="" />
        <button type="submit">Submit</button>
      </form>
    `;

    // Mock chrome global
    (global as any).chrome = {
      storage: {
        sync: {
          get: vi.fn((_keys, cb) => cb({ domsynapse_enabled: true })),
          set: vi.fn((_obj, cb) => cb?.()),
        },
      },
    };
  });

  afterEach(() => {
    const root = document.getElementById('domsynapse-extension-root');
    root?.remove();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('initializes and injects floating UI into the page', async () => {
    const copilot = new DomSynapseExtensionCopilot();
    await copilot.init();

    const root = document.getElementById('domsynapse-extension-root');
    expect(root).not.toBeNull();

    const badge = document.getElementById('ds-ext-badge');
    expect(badge).not.toBeNull();

    const panel = document.getElementById('ds-ext-panel');
    expect(panel).not.toBeNull();
    expect(panel?.classList.contains('ds-ext-hidden')).toBe(true);

    copilot.destroy();
  });

  it('toggles panel visibility on badge click', async () => {
    const copilot = new DomSynapseExtensionCopilot();
    await copilot.init();

    const badge = document.getElementById('ds-ext-badge');
    const panel = document.getElementById('ds-ext-panel');

    badge?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(panel?.classList.contains('ds-ext-hidden')).toBe(false);

    badge?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(panel?.classList.contains('ds-ext-hidden')).toBe(true);

    copilot.destroy();
  });

  it('renders quick action chips and handles prompt interaction', async () => {
    const copilot = new DomSynapseExtensionCopilot();
    await copilot.init();

    const chips = document.querySelectorAll('.ds-ext-chip');
    expect(chips.length).toBeGreaterThan(0);

    const input = document.getElementById('ds-ext-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    copilot.destroy();
  });
});
