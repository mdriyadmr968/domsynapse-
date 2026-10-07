import {
  DOMObserver,
  ActionDispatcher,
  SemanticSerializer,
  ActionValidator,
  DomSynapseAction,
  ActionResult,
} from '@domsynapse/core';

interface ExtensionConfig {
  endpoint: string;
  enabled: boolean;
  stream: boolean;
}

class DomSynapseExtensionCopilot {
  private observer: DOMObserver | null = null;
  private dispatcher: ActionDispatcher;
  private serializer: SemanticSerializer;
  private validator: ActionValidator;
  private config: ExtensionConfig = {
    endpoint: 'http://localhost:3000/api/domsynapse',
    enabled: true,
    stream: true,
  };

  private rootEl: HTMLElement | null = null;
  private isOpen = false;
  private isObserving = false;
  private activeSpotlightEl: HTMLElement | null = null;
  private pendingAction: DomSynapseAction | null = null;

  constructor() {
    this.dispatcher = new ActionDispatcher();
    this.serializer = new SemanticSerializer();
    this.validator = new ActionValidator();
  }

  public async init(): Promise<void> {
    // Avoid double initialization
    if (document.getElementById('domsynapse-extension-root')) {
      return;
    }

    await this.loadConfig();

    if (!this.config.enabled) {
      console.log('[DomSynapse] Extension disabled in settings.');
      return;
    }

    this.mountUI();
    this.startObserver();
  }

  private loadConfig(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['domsynapse_endpoint', 'domsynapse_enabled', 'domsynapse_stream'], (items) => {
          if (items.domsynapse_endpoint) this.config.endpoint = items.domsynapse_endpoint;
          if (typeof items.domsynapse_enabled === 'boolean') this.config.enabled = items.domsynapse_enabled;
          if (typeof items.domsynapse_stream === 'boolean') this.config.stream = items.domsynapse_stream;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private startObserver(): void {
    try {
      this.observer = new DOMObserver({
        autoObserveForms: true,
        trackInputs: true,
        debounceMs: 250,
      });

      this.observer.onContextChange(() => {
        this.updateBadge();
      });

      this.observer.start();
      this.isObserving = true;
      this.updateBadge();
    } catch (err) {
      console.warn('[DomSynapse] Observer initialization error:', err);
    }
  }

  private mountUI(): void {
    const root = document.createElement('div');
    root.id = 'domsynapse-extension-root';
    root.className = 'ds-ext-container';
    root.innerHTML = `
      <div id="ds-ext-badge" class="ds-ext-badge" title="DomSynapse AI Copilot">
        <svg class="ds-ext-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
        </svg>
        <span id="ds-ext-field-count" class="ds-ext-count">0</span>
      </div>

      <div id="ds-ext-panel" class="ds-ext-panel ds-ext-hidden">
        <div class="ds-ext-header">
          <div class="ds-ext-title">
            <span class="ds-ext-brand">DomSynapse</span>
            <span class="ds-ext-badge-status" id="ds-ext-status">Active</span>
          </div>
          <div class="ds-ext-controls">
            <button id="ds-ext-undo-btn" class="ds-ext-btn-icon" title="Undo autofill" disabled>↶</button>
            <button id="ds-ext-redo-btn" class="ds-ext-btn-icon" title="Redo autofill" disabled>↷</button>
            <button id="ds-ext-close-btn" class="ds-ext-btn-icon" title="Minimize">✕</button>
          </div>
        </div>

        <div id="ds-ext-messages" class="ds-ext-messages">
          <div class="ds-ext-msg ds-ext-msg-system">
            👋 DomSynapse active on this page. Ask anything to autofill forms or highlight required fields.
          </div>
        </div>

        <div id="ds-ext-preview" class="ds-ext-preview ds-ext-hidden"></div>

        <div class="ds-ext-quick-chips">
          <button class="ds-ext-chip" data-prompt="Fill all empty fields in the form with sensible demo information">⚡ Fill Form</button>
          <button class="ds-ext-chip" data-prompt="Highlight and spotlight the first required field on this page">🎯 Spotlight</button>
          <button class="ds-ext-chip" data-prompt="Summarize the form fields on this page">📋 Summarize</button>
        </div>

        <form id="ds-ext-form" class="ds-ext-input-row">
          <input id="ds-ext-input" type="text" placeholder="Ask AI Copilot to autofill, explain, or assist..." autocomplete="off" />
          <button type="submit" id="ds-ext-submit" class="ds-ext-send-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
            </svg>
          </button>
        </form>
      </div>

      <div id="ds-ext-spotlight" class="ds-ext-spotlight-backdrop ds-ext-hidden">
        <div id="ds-ext-spotlight-box" class="ds-ext-spotlight-box">
          <div class="ds-ext-spotlight-banner">
            <span id="ds-ext-spotlight-text">Spotlight</span>
            <button id="ds-ext-spotlight-dismiss">Got it</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    this.rootEl = root;

    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.rootEl) return;

    const badge = this.rootEl.querySelector('#ds-ext-badge');
    const panel = this.rootEl.querySelector('#ds-ext-panel');
    const closeBtn = this.rootEl.querySelector('#ds-ext-close-btn');
    const form = this.rootEl.querySelector('#ds-ext-form') as HTMLFormElement;
    const input = this.rootEl.querySelector('#ds-ext-input') as HTMLInputElement;
    const undoBtn = this.rootEl.querySelector('#ds-ext-undo-btn') as HTMLButtonElement;
    const redoBtn = this.rootEl.querySelector('#ds-ext-redo-btn') as HTMLButtonElement;
    const spotlightDismiss = this.rootEl.querySelector('#ds-ext-spotlight-dismiss') as HTMLButtonElement;

    badge?.addEventListener('click', () => {
      this.isOpen = !this.isOpen;
      panel?.classList.toggle('ds-ext-hidden', !this.isOpen);
      if (this.isOpen) {
        input?.focus();
        this.updateHistoryButtons();
      }
    });

    closeBtn?.addEventListener('click', () => {
      this.isOpen = false;
      panel?.classList.add('ds-ext-hidden');
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      this.handleUserPrompt(text);
    });

    this.rootEl.querySelectorAll('.ds-ext-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const prompt = (e.currentTarget as HTMLElement).getAttribute('data-prompt');
        if (prompt) this.handleUserPrompt(prompt);
      });
    });

    undoBtn?.addEventListener('click', () => {
      if (this.dispatcher.undo()) {
        this.addMessage('system', 'Autofill action undone.');
        this.updateHistoryButtons();
      }
    });

    redoBtn?.addEventListener('click', () => {
      if (this.dispatcher.redo()) {
        this.addMessage('system', 'Autofill action redone.');
        this.updateHistoryButtons();
      }
    });

    spotlightDismiss?.addEventListener('click', () => {
      this.dismissSpotlight();
    });
  }

  private updateBadge(): void {
    if (!this.rootEl || !this.observer) return;
    const ctx = this.observer.getContext();
    const countEl = this.rootEl.querySelector('#ds-ext-field-count');
    const totalFields = ctx.forms.reduce((acc, f) => acc + f.fields.length, 0);
    if (countEl) {
      countEl.textContent = `${totalFields}`;
    }
  }

  private updateHistoryButtons(): void {
    if (!this.rootEl) return;
    const undoBtn = this.rootEl.querySelector('#ds-ext-undo-btn') as HTMLButtonElement;
    const redoBtn = this.rootEl.querySelector('#ds-ext-redo-btn') as HTMLButtonElement;
    if (undoBtn) undoBtn.disabled = !this.dispatcher.canUndo();
    if (redoBtn) redoBtn.disabled = !this.dispatcher.canRedo();
  }

  private addMessage(role: 'user' | 'assistant' | 'system', content: string): HTMLElement {
    const messagesEl = this.rootEl?.querySelector('#ds-ext-messages');
    const msg = document.createElement('div');
    msg.className = `ds-ext-msg ds-ext-msg-${role}`;
    msg.textContent = content;
    messagesEl?.appendChild(msg);
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    return msg;
  }

  private async handleUserPrompt(prompt: string): Promise<void> {
    this.addMessage('user', prompt);
    const assistantMsg = this.addMessage('assistant', 'Thinking...');

    const pageContext = this.observer ? this.observer.getContext() : null;

    try {
      const res = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          pageContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && res.body) {
        assistantMsg.textContent = '';
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let reply = '';
        let proposedAction: DomSynapseAction | undefined;

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
                reply += parsed.delta;
                assistantMsg.textContent = reply;
              } else if (parsed.type === 'action' && parsed.action) {
                proposedAction = parsed.action;
              }
            } catch {
              // chunk parse error ignore
            }
          }
        }

        if (proposedAction) {
          this.stageAction(proposedAction);
        }
      } else {
        const data = await res.json();
        assistantMsg.textContent = data.reply || data.content || data.message || 'Done.';

        if (data.action) {
          this.stageAction(data.action);
        }
      }
    } catch (err: any) {
      // Local fallback in case backend server is unreachable
      console.warn('[DomSynapse] API call failed, using client-side fallback:', err);
      const fallbackReply = this.handleLocalFallback(prompt);
      assistantMsg.textContent = fallbackReply;
    }
  }

  private handleLocalFallback(prompt: string): string {
    const ctx = this.observer?.getContext();
    const lower = prompt.toLowerCase();

    if (lower.includes('fill') && ctx && ctx.forms.length > 0) {
      const firstForm = ctx.forms[0];
      const action: DomSynapseAction = {
        type: 'fill_form',
        formSelector: firstForm.selector,
        fields: firstForm.fields.map((f) => ({
          selector: f.selector,
          name: f.name,
          value: f.type === 'email' ? 'demo@domsynapse.io' : 'Demo Input',
          fieldLabel: f.label || f.name,
        })),
      };
      this.stageAction(action);
      return `Generated autofill proposal with ${action.fields.length} field(s). Review below:`;
    } else if (lower.includes('spotlight') || lower.includes('highlight')) {
      const firstField = ctx?.forms[0]?.fields[0];
      if (firstField && firstField.selector) {
        this.triggerSpotlight(firstField.selector, `First field: ${firstField.label || firstField.name}`);
        return `Spotlighted ${firstField.label || firstField.name}.`;
      }
    }

    return `I see ${ctx?.forms.length || 0} form(s) on this page with ${
      ctx?.forms.reduce((acc, f) => acc + f.fields.length, 0) || 0
    } fields.`;
  }

  private stageAction(action: DomSynapseAction): void {
    const validation = this.validator.validate(action);
    if (!validation.isValid) {
      this.addMessage('system', `Proposal rejected: ${validation.errors.join(', ')}`);
      return;
    }

    if (action.type === 'spotlight') {
      this.triggerSpotlight(action.selector, action.message);
      return;
    }

    if (action.type === 'focus') {
      this.dispatcher.focusElement(action.selector);
      return;
    }

    if (action.type === 'fill_form') {
      this.pendingAction = action;
      this.showDiffPreview(action);
    }
  }

  private showDiffPreview(action: DomSynapseAction): void {
    const previewEl = this.rootEl?.querySelector('#ds-ext-preview');
    if (!previewEl) return;

    previewEl.classList.remove('ds-ext-hidden');
    previewEl.innerHTML = `
      <div class="ds-ext-preview-header">
        <strong>Proposed Autofill (${action.fields.length} fields)</strong>
      </div>
      <div class="ds-ext-diff-list">
        ${action.fields
          .map((f) => {
            const el = f.selector ? document.querySelector(f.selector) as HTMLInputElement : null;
            const currentVal = el ? el.value || '(empty)' : '(unknown)';
            return `
              <div class="ds-ext-diff-item">
                <span class="ds-ext-diff-label">${f.fieldLabel || f.name || f.selector}</span>
                <div class="ds-ext-diff-vals">
                  <span class="ds-ext-diff-old">${currentVal}</span>
                  <span class="ds-ext-diff-arrow">→</span>
                  <span class="ds-ext-diff-new">${f.value}</span>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
      <div class="ds-ext-preview-actions">
        <button id="ds-ext-apply-btn" class="ds-ext-btn ds-ext-btn-primary">Apply Changes</button>
        <button id="ds-ext-cancel-btn" class="ds-ext-btn ds-ext-btn-secondary">Cancel</button>
      </div>
    `;

    previewEl.querySelector('#ds-ext-apply-btn')?.addEventListener('click', () => {
      this.applyPendingAction();
    });

    previewEl.querySelector('#ds-ext-cancel-btn')?.addEventListener('click', () => {
      this.pendingAction = null;
      previewEl.classList.add('ds-ext-hidden');
      this.addMessage('system', 'Proposal dismissed.');
    });
  }

  private applyPendingAction(): void {
    if (!this.pendingAction) return;

    const result = this.dispatcher.execute(this.pendingAction);
    const previewEl = this.rootEl?.querySelector('#ds-ext-preview');
    previewEl?.classList.add('ds-ext-hidden');

    if (result.success) {
      this.addMessage('system', `✓ Successfully updated ${result.appliedCount} field(s).`);
    } else {
      this.addMessage('system', `⚠ Failed: ${result.errors?.join(', ') || 'Unknown error'}`);
    }

    this.pendingAction = null;
    this.updateHistoryButtons();
  }

  private triggerSpotlight(selector: string, message: string): void {
    const el = document.querySelector(selector) as HTMLElement;
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const spotlightBackdrop = this.rootEl?.querySelector('#ds-ext-spotlight') as HTMLElement;
    const spotlightBox = this.rootEl?.querySelector('#ds-ext-spotlight-box') as HTMLElement;
    const spotlightText = this.rootEl?.querySelector('#ds-ext-spotlight-text') as HTMLElement;

    if (!spotlightBackdrop || !spotlightBox) return;

    const rect = el.getBoundingClientRect();
    const padding = 6;

    spotlightBox.style.top = `${rect.top - padding}px`;
    spotlightBox.style.left = `${rect.left - padding}px`;
    spotlightBox.style.width = `${rect.width + padding * 2}px`;
    spotlightBox.style.height = `${rect.height + padding * 2}px`;

    if (spotlightText) {
      spotlightText.textContent = message || `Spotlight: ${selector}`;
    }

    spotlightBackdrop.classList.remove('ds-ext-hidden');
    this.activeSpotlightEl = el;
  }

  private dismissSpotlight(): void {
    const spotlightBackdrop = this.rootEl?.querySelector('#ds-ext-spotlight') as HTMLElement;
    spotlightBackdrop?.classList.add('ds-ext-hidden');
    this.activeSpotlightEl = null;
  }

  public destroy(): void {
    this.observer?.stop();
    this.rootEl?.remove();
    this.rootEl = null;
  }
}

// Auto-run when injected into webpage
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const copilot = new DomSynapseExtensionCopilot();
  copilot.init();
}

export { DomSynapseExtensionCopilot };
