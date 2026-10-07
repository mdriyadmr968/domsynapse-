import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DOMObserver } from '../src/observer/dom-observer';

describe('DOMObserver', () => {
  let observer: DOMObserver;

  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <h1>Dashboard</h1>
        <form id="sample">
          <input id="q" name="q" value="initial" />
        </form>
      </main>
    `;
    observer = new DOMObserver({
      root: document.body,
      debounceMs: 50,
    });
  });

  afterEach(() => {
    observer.disconnect();
  });

  it('captures initial context accurately', () => {
    const ctx = observer.captureNow();
    expect(ctx.headings[0].text).toBe('Dashboard');
    expect(ctx.forms[0].fields[0].value).toBe('initial');
  });

  it('notifies listeners when context changes', async () => {
    const listener = vi.fn();
    observer.start();
    observer.onContextChange(listener);

    // Initial capture was dispatched
    expect(listener).toHaveBeenCalled();

    // Mutate DOM
    const input = document.getElementById('q') as HTMLInputElement;
    input.value = 'updated query';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait for debounce timer
    await new Promise((r) => setTimeout(r, 80));

    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(2);
    const latestCall = listener.mock.calls[listener.mock.calls.length - 1][0];
    expect(latestCall.forms[0].fields[0].value).toBe('updated query');
  });
});
