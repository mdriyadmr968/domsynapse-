import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DomSynapseProvider, useDomSynapse } from '../src/context/DomSynapseContext';

describe('React SSE Stream Consumption', () => {
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

  it('receives and stitches streaming tokens from text/event-stream', async () => {
    const encoder = new TextEncoder();
    const mockSSEStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"type":"token","delta":"Streaming "}\n\n')
        );
        controller.enqueue(
          encoder.encode('data: {"type":"token","delta":"answer."}\n\n')
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(mockSSEStream, {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );

    let contextValue: any = null;
    function Consumer() {
      contextValue = useDomSynapse();
      return <div>Stream Consumer</div>;
    }

    await act(async () => {
      root.render(
        <DomSynapseProvider apiEndpoint="/api/copilot" customFetch={mockFetch as any}>
          <Consumer />
        </DomSynapseProvider>
      );
    });

    await act(async () => {
      await contextValue.sendMessage('Hello stream');
    });

    expect(contextValue.messages.length).toBeGreaterThanOrEqual(2);
    const assistantMsg = contextValue.messages.find((m: any) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.content).toBe('Streaming answer.');
    expect(assistantMsg.isStreaming).toBe(false);
  });
});
