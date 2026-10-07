import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DomSynapseProvider, useDomSynapse } from '../src/context/DomSynapseContext';
import { DiffConfirmCard } from '../src/components/DiffConfirmCard';
import { SpotlightOverlay } from '../src/components/SpotlightOverlay';

describe('DiffConfirmCard & SpotlightOverlay', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
  });

  it('renders DiffConfirmCard when pendingAction is set and approves it', async () => {
    const formContainer = document.createElement('div');
    formContainer.innerHTML = `
      <form id="shipping-form">
        <input id="city" name="city" value="Old City" />
      </form>
    `;
    document.body.appendChild(formContainer);

    let contextValue: any = null;
    function Consumer() {
      contextValue = useDomSynapse();
      return (
        <div>
          <DiffConfirmCard />
        </div>
      );
    }

    await act(async () => {
      root.render(
        <DomSynapseProvider options={{ debounceMs: 10 }}>
          <Consumer />
        </DomSynapseProvider>
      );
    });

    expect(container.querySelector('[data-testid="synapse-diff-modal"]')).toBeNull();

    await act(async () => {
      await contextValue.sendMessage('fill this form please');
    });

    const modal = container.querySelector('[data-testid="synapse-diff-modal"]');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Old City');
    expect(modal?.textContent).toContain('Sample Value');

    // Click confirm button
    const confirmBtn = container.querySelector('.synapse-btn-confirm') as HTMLButtonElement;
    await act(async () => {
      confirmBtn.click();
    });

    const cityInput = document.getElementById('city') as HTMLInputElement;
    expect(cityInput.value).toBe('Sample Value');
    expect(container.querySelector('[data-testid="synapse-diff-modal"]')).toBeNull();
  });
});
