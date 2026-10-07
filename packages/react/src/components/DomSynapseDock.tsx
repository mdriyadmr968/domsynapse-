import React, { useState, useRef, useEffect } from 'react';
import { useDomSynapse } from '../context/DomSynapseContext';
import { DomSynapseDockProps } from '../types';
import { SpotlightOverlay } from './SpotlightOverlay';
import { DiffConfirmCard } from './DiffConfirmCard';

const DEFAULT_SUGGESTIONS = [
  'Help me fill this form',
  'What does this screen do?',
  'Where is the submit button?',
];

export function DomSynapseDock({
  position = 'bottom-right',
  title = 'DomSynapse Copilot',
  placeholder = 'Ask anything about this page...',
  suggestedPrompts = DEFAULT_SUGGESTIONS,
  className = '',
  hideOverlayComponents = false,
}: DomSynapseDockProps) {
  const {
    isOpen,
    setIsOpen,
    messages,
    sendMessage,
    isLoading,
    pageContext,
    canUndo,
    canRedo,
    undo,
    redo,
    clearMessages,
  } = useDomSynapse();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const posClass = `synapse-pos-${position}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Global Escape key dismiss for accessible keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalEsc);
    return () => window.removeEventListener('keydown', handleGlobalEsc);
  }, [isOpen, setIsOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const formCount = pageContext?.forms.length || 0;
  const fieldCount = pageContext?.forms.reduce((acc, f) => acc + f.fields.length, 0) || 0;

  return (
    <>
      {!hideOverlayComponents && (
        <>
          <SpotlightOverlay />
          <DiffConfirmCard />
        </>
      )}

      <div className={`synapse-dock-container ${posClass} ${className}`}>
        {isOpen ? (
          <div className="synapse-dock-panel" data-testid="synapse-dock-panel">
            {/* Header */}
            <div className="synapse-dock-header">
              <div className="synapse-dock-title-group">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <h2 className="synapse-dock-title">{title}</h2>
              </div>
              <div className="synapse-header-actions">
                <button
                  type="button"
                  className="synapse-btn-icon"
                  title="Clear chat"
                  onClick={clearMessages}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  className="synapse-btn-icon"
                  title="Minimize"
                  onClick={() => setIsOpen(false)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            {/* "What I See" Context Bar */}
            <div className="synapse-context-pill-bar">
              <span className="synapse-context-pill" title={pageContext?.url || 'Observing live page'}>
                <span className="synapse-pill-indicator"></span>
                {formCount > 0
                  ? `${formCount} form (${fieldCount} fields)`
                  : 'Page synced'}
              </span>
              <span>{pageContext?.title ? pageContext.title.slice(0, 24) : 'Ready'}</span>
            </div>

            {/* Message Feed */}
            <div className="synapse-messages-feed">
              {messages.length === 0 ? (
                <div className="synapse-msg-empty">
                  Ask me questions about the current page, or ask me to fill in details.
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`synapse-msg-bubble ${
                      msg.role === 'user'
                        ? 'synapse-msg-user'
                        : msg.role === 'assistant'
                        ? 'synapse-msg-assistant'
                        : 'synapse-msg-empty'
                    }`}
                  >
                    <div>{msg.content}</div>
                    {msg.action && (
                      <div className="synapse-msg-action-badge">
                        <span>⚡ Action: {msg.action.type}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="synapse-msg-bubble synapse-msg-assistant">
                  <em>Thinking and observing screen...</em>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions Chips */}
            {suggestedPrompts.length > 0 && (
              <div className="synapse-chips-container">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="synapse-chip-btn"
                    onClick={() => sendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Undo / Redo Toolbar */}
            {(canUndo || canRedo) && (
              <div className="synapse-history-bar">
                <span>History:</span>
                <button
                  type="button"
                  className="synapse-link-btn"
                  onClick={undo}
                  disabled={!canUndo}
                >
                  ↩ Undo last fill
                </button>
                {canRedo && (
                  <button
                    type="button"
                    className="synapse-link-btn"
                    onClick={redo}
                  >
                    ↪ Redo
                  </button>
                )}
              </div>
            )}

            {/* Input Bar */}
            <div className="synapse-input-bar">
              <textarea
                className="synapse-textarea"
                placeholder={placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                className="synapse-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="synapse-launcher-btn"
            onClick={() => setIsOpen(true)}
            data-testid="synapse-launcher"
            aria-expanded={false}
            aria-haspopup="dialog"
            aria-label={title}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>{title}</span>
          </button>
        )}
      </div>
    </>
  );
}
