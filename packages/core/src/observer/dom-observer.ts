import { DOMObserverOptions, PageContext } from '../types';
import { SemanticSerializer } from '../serializer/semantic-serializer';
import { PIIShield } from '../security/pii-shield';

export type ContextChangeListener = (context: PageContext) => void;

export class DOMObserver {
  private root?: Document | HTMLElement;
  private debounceMs: number;
  private trackFocus: boolean;
  private trackInputs: boolean;
  private serializer: SemanticSerializer;
  private listeners: Set<ContextChangeListener> = new Set();

  private mutationObserver?: MutationObserver;
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private isObserving = false;
  private lastContext?: PageContext;

  // Bound event handlers for clean removal
  private handleFocusInBound: (e: Event) => void;
  private handleInputBound: (e: Event) => void;
  private handleNavigationBound: () => void;

  constructor(options: DOMObserverOptions = {}) {
    this.root = options.root;
    this.debounceMs = options.debounceMs ?? 200;
    this.trackFocus = options.trackFocus ?? true;
    this.trackInputs = options.trackInputs ?? true;

    const piiShield = new PIIShield(options.piiOptions);
    this.serializer = new SemanticSerializer({
      piiShield,
      ignoreSelectors: options.ignoreSelectors,
    });

    this.handleFocusInBound = this.handleFocusIn.bind(this);
    this.handleInputBound = this.handleInput.bind(this);
    this.handleNavigationBound = this.handleNavigation.bind(this);
  }

  /**
   * Starts observing DOM mutations and user interactions
   */
  public start(): void {
    if (this.isObserving) return;
    this.isObserving = true;

    const targetNode = this.resolveTargetNode();

    // 1. Mutation Observer for DOM additions/removals
    if (typeof MutationObserver !== 'undefined' && targetNode) {
      this.mutationObserver = new MutationObserver(() => {
        this.scheduleUpdate();
      });

      this.mutationObserver.observe(targetNode, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-invalid', 'disabled', 'class', 'value'],
      });
    }

    // 2. Focus Tracking
    if (this.trackFocus && typeof window !== 'undefined') {
      window.addEventListener('focusin', this.handleFocusInBound, true);
    }

    // 3. Form Input Tracking
    if (this.trackInputs && typeof window !== 'undefined') {
      window.addEventListener('input', this.handleInputBound, true);
      window.addEventListener('change', this.handleInputBound, true);
    }

    // 4. Navigation Tracking (SPA routing)
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.handleNavigationBound);
      window.addEventListener('hashchange', this.handleNavigationBound);
    }

    // Trigger initial capture
    this.captureNow();
  }

  /**
   * Stops observing and cleans up all event listeners
   */
  public disconnect(): void {
    if (!this.isObserving) return;
    this.isObserving = false;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = undefined;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('focusin', this.handleFocusInBound, true);
      window.removeEventListener('input', this.handleInputBound, true);
      window.removeEventListener('change', this.handleInputBound, true);
      window.removeEventListener('popstate', this.handleNavigationBound);
      window.removeEventListener('hashchange', this.handleNavigationBound);
    }
  }

  /**
   * Alias for disconnect()
   */
  public stop(): void {
    this.disconnect();
  }

  /**
   * Subscribes to context changes
   */
  public onContextChange(listener: ContextChangeListener): () => void {
    this.listeners.add(listener);
    if (this.lastContext) {
      listener(this.lastContext);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Captures and returns current screen context immediately
   */
  public captureNow(): PageContext {
    const context = this.serializer.serialize(this.root);
    this.lastContext = context;
    this.notifyListeners(context);
    return context;
  }

  /**
   * Returns current or cached page context
   */
  public getContext(): PageContext {
    return this.lastContext || this.serializer.serialize(this.root);
  }

  /**
   * Formats the active context for LLM prompt ingestion
   */
  public formatContextForLLM(context?: PageContext): string {
    const target = context || this.lastContext || this.captureNow();
    return this.serializer.formatForLLM(target);
  }

  private scheduleUpdate(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.captureNow();
    }, this.debounceMs);
  }

  private handleFocusIn(e: Event): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      this.scheduleUpdate();
    }
  }

  private handleInput(): void {
    this.scheduleUpdate();
  }

  private handleNavigation(): void {
    this.scheduleUpdate();
  }

  private notifyListeners(context: PageContext): void {
    this.listeners.forEach((listener) => {
      try {
        listener(context);
      } catch (err) {
        console.error('[DomSynapse] Error in context change listener:', err);
      }
    });
  }

  private resolveTargetNode(): Node | null {
    if (this.root) {
      return this.root;
    }
    if (typeof document !== 'undefined') {
      return document.body || document.documentElement;
    }
    return null;
  }
}
