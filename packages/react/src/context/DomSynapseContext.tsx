import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  DOMObserver,
  ActionDispatcher,
  PageContext,
  DomSynapseAction,
  ActionResult,
  SpotlightBounds,
  parseLLMToolCall,
} from '@domsynapse/core';
import {
  DomSynapseContextValue,
  DomSynapseProviderProps,
  CopilotMessage,
  DiffFieldChange,
} from '../types';

const DomSynapseContext = createContext<DomSynapseContextValue | null>(null);

export function DomSynapseProvider({
  children,
  apiEndpoint,
  options = {},
  customFetch,
  onAction,
  initialMessages = [],
}: DomSynapseProviderProps) {
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [isObserving, setIsObserving] = useState<boolean>(false);
  const [messages, setMessages] = useState<CopilotMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<DomSynapseAction | null>(null);
  const [pendingDiffChanges, setPendingDiffChanges] = useState<DiffFieldChange[]>([]);
  const [spotlight, setSpotlight] = useState<{
    selector: string;
    message: string;
    bounds?: SpotlightBounds;
  } | null>(null);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const observerRef = useRef<DOMObserver | null>(null);
  const dispatcherRef = useRef<ActionDispatcher | null>(null);

  // Initialize Observer & Dispatcher
  useEffect(() => {
    if (typeof document === 'undefined') return;

    try {
      const dispatcher = new ActionDispatcher(document);
      dispatcherRef.current = dispatcher;

      if (options.autoObserveForms !== false) {
        const observer = new DOMObserver({
          debounceMs: options.debounceMs ?? 250,
          trackFocus: options.trackFocus !== false,
          trackInputs: options.trackInputs !== false,
          ignoreSelectors: options.ignoreSelectors,
          piiOptions: options.piiOptions,
        });

        observer.onContextChange((ctx) => {
          setPageContext(ctx);
        });

        observer.start();
        observerRef.current = observer;
        setIsObserving(true);
      }
    } catch (err: any) {
      console.error('[DomSynapse] Initialization error:', err);
      setError(err.message || 'Failed to initialize DomSynapse');
    }

    return () => {
      observerRef.current?.stop();
      observerRef.current = null;
      setIsObserving(false);
    };
  }, [options.autoObserveForms, options.debounceMs, options.trackFocus, options.trackInputs]);

  const updateHistoryState = useCallback(() => {
    if (dispatcherRef.current) {
      setCanUndo(dispatcherRef.current.canUndo());
      setCanRedo(dispatcherRef.current.canRedo());
    }
  }, []);

  // Compute diff preview when pendingAction is a fill_form action
  const computeDiff = useCallback((action: DomSynapseAction) => {
    if (action.type !== 'fill_form' || typeof document === 'undefined') {
      setPendingDiffChanges([]);
      return;
    }

    const diffs: DiffFieldChange[] = [];

    for (const field of action.fields) {
      let el: HTMLElement | null = null;
      if (field.selector) {
        try {
          el = document.querySelector(field.selector);
        } catch {
          // ignore invalid selector
        }
      } else if (field.name) {
        el = document.querySelector(`[name="${field.name}"]`);
      }

      let prevVal = '';
      let prevChecked: boolean | undefined = undefined;
      let tagName = 'input';
      let type: string | undefined = undefined;

      if (el) {
        tagName = el.tagName.toLowerCase();
        if (el instanceof HTMLInputElement) {
          prevVal = el.value;
          type = el.type;
          if (el.type === 'checkbox' || el.type === 'radio') {
            prevChecked = el.checked;
          }
        } else if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
          prevVal = el.value;
        } else if (el.isContentEditable) {
          prevVal = el.textContent || '';
        }
      }

      diffs.push({
        selector: field.selector,
        name: field.name,
        fieldLabel: field.fieldLabel || field.name || field.selector,
        previousValue: prevVal,
        proposedValue: field.value,
        previousChecked: prevChecked,
        proposedChecked: field.value === 'true' || field.value === '1',
        tagName,
        type,
      });
    }

    setPendingDiffChanges(diffs);
  }, []);

  const handleProposedAction = useCallback(
    async (action: DomSynapseAction) => {
      if (onAction) {
        const allowed = await onAction(action);
        if (allowed === false) return;
      }

      if (action.type === 'fill_form') {
        setPendingAction(action);
        computeDiff(action);
      } else if (action.type === 'spotlight') {
        const bounds = dispatcherRef.current?.getSpotlightBounds(action.selector) || undefined;
        dispatcherRef.current?.focusElement(action.selector);
        setSpotlight({
          selector: action.selector,
          message: action.message,
          bounds,
        });
      } else if (action.type === 'focus') {
        dispatcherRef.current?.focusElement(action.selector);
      }
    },
    [computeDiff, onAction]
  );

  const approvePendingAction = useCallback(async (): Promise<ActionResult | null> => {
    if (!pendingAction || !dispatcherRef.current) return null;

    const result = dispatcherRef.current.execute(pendingAction);
    updateHistoryState();

    setMessages((prev) => [
      ...prev,
      {
        id: `sys_action_${Date.now()}`,
        role: 'assistant',
        content: result.success
          ? `Autofilled ${result.appliedCount} field(s) successfully.`
          : `Failed to fill some fields: ${result.errors?.join(', ') || 'Unknown error'}`,
        timestamp: Date.now(),
        action: pendingAction,
        actionResult: result,
      },
    ]);

    setPendingAction(null);
    setPendingDiffChanges([]);
    return result;
  }, [pendingAction, updateHistoryState]);

  const rejectPendingAction = useCallback(() => {
    setPendingAction(null);
    setPendingDiffChanges([]);
    setMessages((prev) => [
      ...prev,
      {
        id: `sys_action_rejected_${Date.now()}`,
        role: 'system',
        content: 'Form fill suggestion dismissed.',
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const dismissSpotlight = useCallback(() => {
    setSpotlight(null);
  }, []);

  const undo = useCallback((): boolean => {
    if (!dispatcherRef.current) return false;
    const success = dispatcherRef.current.undo();
    updateHistoryState();
    return success;
  }, [updateHistoryState]);

  const redo = useCallback((): boolean => {
    if (!dispatcherRef.current) return false;
    const success = dispatcherRef.current.redo();
    updateHistoryState();
    return success;
  }, [updateHistoryState]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMsg: CopilotMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      try {
        const fetchFn = customFetch || (typeof fetch !== 'undefined' ? fetch : undefined);

        if (apiEndpoint && fetchFn) {
          const res = await fetchFn(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: content,
              pageContext,
              messages: [...messages, userMsg],
            }),
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => null);
            const errMsg =
              errBody?.error ||
              errBody?.message ||
              `Server returned HTTP ${res.status}: ${res.statusText}`;
            throw new Error(errMsg);
          }

          const contentType = res.headers.get('content-type') || '';

          if (contentType.includes('text/event-stream') && res.body) {
            const assistantId = `assistant_${Date.now()}`;
            let accumulatedReply = '';
            let stagedAction: DomSynapseAction | undefined;

            setMessages((prev) => [
              ...prev,
              {
                id: assistantId,
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                isStreaming: true,
              },
            ]);

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;
                const dataStr = trimmed.slice(5).trim();
                if (dataStr === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.type === 'token' && parsed.delta) {
                    accumulatedReply += parsed.delta;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: accumulatedReply, isStreaming: true }
                          : m
                      )
                    );
                  } else if (parsed.type === 'action' && parsed.action) {
                    stagedAction = parsed.action;
                  }
                } catch {
                  // ignore chunk parse error
                }
              }
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, isStreaming: false, action: stagedAction }
                  : m
              )
            );

            if (stagedAction) {
              await handleProposedAction(stagedAction);
            }
          } else {
            const data = await res.json();
            const assistantMsg: CopilotMessage = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: data.reply || data.content || data.message || '',
              timestamp: Date.now(),
            };

            setMessages((prev) => [...prev, assistantMsg]);

            if (data.action) {
              await handleProposedAction(data.action);
            } else if (data.tool_call) {
              const parsed = parseLLMToolCall(data.tool_call.name, data.tool_call.arguments);
              if (parsed.success) {
                await handleProposedAction(parsed.action);
              }
            }
          }
        } else {
          // Client-side local smart assistant fallback if no server configured
          let reply = `I observed this page: "${pageContext?.title || 'Active Page'}" with ${
            pageContext?.forms.length || 0
          } form(s) and ${pageContext?.forms.reduce((acc, f) => acc + f.fields.length, 0) || 0} fields.`;

          const lower = content.toLowerCase();
          if (lower.includes('fill') || lower.includes('complete')) {
            const firstForm = pageContext?.forms[0];
            if (firstForm && firstForm.fields.length > 0) {
              const demoFields = firstForm.fields.map((f) => ({
                selector: f.selector,
                name: f.name,
                value: f.type === 'email' ? 'alex@example.com' : 'Sample Value',
                fieldLabel: f.label || f.name,
              }));

              const action: DomSynapseAction = {
                type: 'fill_form',
                formSelector: firstForm.selector,
                fields: demoFields,
              };

              reply = `I prepared an autofill proposal for "${firstForm.name || 'the form'}". Please review the changes in the preview modal.`;
              await handleProposedAction(action);
            } else {
              reply = 'No unfilled form fields found on the current page to autofill.';
            }
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: reply,
              timestamp: Date.now(),
            },
          ]);
        }
      } catch (err: any) {
        console.error('[DomSynapse] sendMessage error:', err);
        setError(err.message || 'Error sending message');
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'system',
            content: `Failed to receive answer: ${err.message || 'Unknown network error'}`,
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiEndpoint, customFetch, handleProposedAction, messages, pageContext]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const value: DomSynapseContextValue = {
    pageContext,
    isObserving,
    messages,
    sendMessage,
    pendingAction,
    pendingDiffChanges,
    approvePendingAction,
    rejectPendingAction,
    spotlight,
    dismissSpotlight,
    undo,
    redo,
    canUndo,
    canRedo,
    isOpen,
    setIsOpen,
    isLoading,
    error,
    clearMessages,
    options,
  };

  return <DomSynapseContext.Provider value={value}>{children}</DomSynapseContext.Provider>;
}

export function useDomSynapse(): DomSynapseContextValue {
  const ctx = useContext(DomSynapseContext);
  if (!ctx) {
    throw new Error('useDomSynapse must be used within a <DomSynapseProvider>');
  }
  return ctx;
}
