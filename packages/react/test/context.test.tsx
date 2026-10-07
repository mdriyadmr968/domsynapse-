import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DomSynapseProvider, useDomSynapse } from '../src/context/DomSynapseContext';

describe('DomSynapseContext & Provider', () => {
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

  it('provides context value with observer state and message sending', async () => {
    let contextValue: any = null;

    function TestConsumer() {
      contextValue = useDomSynapse();
      return (
        <div>
          <button
            onClick={() => contextValue.sendMessage('Hello copilot')}
            data-testid="send-btn"
          >
            Send
          </button>
        </div>
      );
    }

    await act(async () => {
      root.render(
        <DomSynapseProvider options={{ debounceMs: 10 }}>
          <TestConsumer />
        </DomSynapseProvider>
      );
    });

    expect(contextValue).not.toBeNull();
    expect(contextValue.messages).toHaveLength(0);

    await act(async () => {
      await contextValue.sendMessage('Hello copilot');
    });

    // Should contain user message and local assistant reply
    expect(contextValue.messages.length).toBeGreaterThanOrEqual(2);
    expect(contextValue.messages[0].content).toBe('Hello copilot');
    expect(contextValue.messages[0].role).toBe('user');
    expect(contextValue.messages[1].role).toBe('assistant');
  });

  it('proposes form fill action and executes on approve', async () => {
    // Setup a form in document body
    const formContainer = document.createElement('div');
    formContainer.innerHTML = `
      <form id="contact-form">
        <input id="email-field" name="email" type="email" value="" />
      </form>
    `;
    document.body.appendChild(formContainer);

    let contextValue: any = null;
    function TestConsumer() {
      contextValue = useDomSynapse();
      return <div>Consumer</div>;
    }

    await act(async () => {
      root.render(
        <DomSynapseProvider options={{ debounceMs: 10 }}>
          <TestConsumer />
        </DomSynapseProvider>
      );
    });

    // Send a message asking to fill
    await act(async () => {
      await contextValue.sendMessage('fill this form please');
    });

    expect(contextValue.pendingAction).not.toBeNull();
    expect(contextValue.pendingAction.type).toBe('fill_form');
    expect(contextValue.pendingDiffChanges.length).toBeGreaterThan(0);

    // Approve the action
    await act(async () => {
      await contextValue.approvePendingAction();
    });

    const emailInput = document.getElementById('email-field') as HTMLInputElement;
    expect(emailInput.value).toBe('alex@example.com');
    expect(contextValue.pendingAction).toBeNull();
    expect(contextValue.canUndo).toBe(true);

    // Test undo
    await act(async () => {
      const undid = contextValue.undo();
      expect(undid).toBe(true);
    });
    expect(emailInput.value).toBe('');
  });
});
