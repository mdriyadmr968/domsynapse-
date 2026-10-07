import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DomSynapseProvider } from '../src/context/DomSynapseContext';
import { DomSynapseDock } from '../src/components/DomSynapseDock';

describe('DomSynapseDock Component', () => {
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

  it('renders collapsed launcher button initially', async () => {
    await act(async () => {
      root.render(
        <DomSynapseProvider options={{ autoObserveForms: false }}>
          <DomSynapseDock title="Test Copilot" />
        </DomSynapseProvider>
      );
    });

    const launcher = container.querySelector('[data-testid="synapse-launcher"]');
    expect(launcher).not.toBeNull();
    expect(launcher?.textContent).toContain('Test Copilot');
    expect(container.querySelector('[data-testid="synapse-dock-panel"]')).toBeNull();
  });

  it('expands panel when launcher button is clicked', async () => {
    await act(async () => {
      root.render(
        <DomSynapseProvider options={{ autoObserveForms: false }}>
          <DomSynapseDock title="Test Copilot" />
        </DomSynapseProvider>
      );
    });

    const launcher = container.querySelector('[data-testid="synapse-launcher"]') as HTMLButtonElement;
    await act(async () => {
      launcher.click();
    });

    const panel = container.querySelector('[data-testid="synapse-dock-panel"]');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain('Test Copilot');
  });
});
