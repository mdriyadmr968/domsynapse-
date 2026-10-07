import { DomSynapseAction, FormFillAction, SpotlightAction } from '../types';

export interface SpotlightBounds {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export class ActionDispatcher {
  private doc: Document;

  constructor(doc?: Document) {
    if (doc) {
      this.doc = doc;
    } else if (typeof document !== 'undefined') {
      this.doc = document;
    } else {
      throw new Error('No Document object provided for ActionDispatcher');
    }
  }

  /**
   * Executes a DomSynapse action
   */
  public execute(action: DomSynapseAction): boolean {
    switch (action.type) {
      case 'fill_form':
        return this.executeFormFill(action);
      case 'focus':
        return this.focusElement(action.selector);
      case 'spotlight':
        return this.focusElement(action.selector);
      default:
        return false;
    }
  }

  /**
   * Fills multiple fields specified in a form fill action
   */
  public executeFormFill(action: FormFillAction): boolean {
    let allSucceeded = true;

    for (const field of action.fields) {
      let targetEl: HTMLElement | null = null;

      if (field.selector) {
        targetEl = this.doc.querySelector(field.selector);
      } else if (field.name) {
        targetEl = this.doc.querySelector(`[name="${field.name}"]`);
      }

      if (!targetEl) {
        allSucceeded = false;
        continue;
      }

      const success = this.setFieldValue(targetEl, field.value);
      if (!success) allSucceeded = false;
    }

    return allSucceeded;
  }

  /**
   * Safely updates an input/textarea/select field triggering React and standard DOM events
   */
  public setFieldValue(element: HTMLElement, value: string): boolean {
    try {
      if (element instanceof HTMLInputElement) {
        if (element.type === 'checkbox' || element.type === 'radio') {
          const shouldCheck = value === 'true' || value === '1' || value === 'checked' || element.value === value;
          element.checked = shouldCheck;
          this.dispatchReactInputEvent(element, shouldCheck, 'checked');
        } else {
          this.dispatchReactInputEvent(element, value, 'value');
        }
        return true;
      }

      if (element instanceof HTMLTextAreaElement) {
        this.dispatchReactInputEvent(element, value, 'value');
        return true;
      }

      if (element instanceof HTMLSelectElement) {
        element.value = value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      if (element.isContentEditable) {
        element.textContent = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }

      return false;
    } catch (err) {
      console.error('[DomSynapse] Failed to set field value:', err);
      return false;
    }
  }

  /**
   * Scrolls an element into view and focuses it
   */
  public focusElement(selector: string): boolean {
    const el = this.doc.querySelector(selector) as HTMLElement | null;
    if (!el) return false;

    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (typeof el.focus === 'function') {
      el.focus();
    }

    return true;
  }

  /**
   * Calculates bounding rect for spotlight overlay
   */
  public getSpotlightBounds(selector: string): SpotlightBounds | null {
    const el = this.doc.querySelector(selector);
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const scrollX = typeof window !== 'undefined' ? window.scrollX || window.pageXOffset : 0;
    const scrollY = typeof window !== 'undefined' ? window.scrollY || window.pageYOffset : 0;

    return {
      top: rect.top + scrollY,
      left: rect.left + scrollX,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom + scrollY,
      right: rect.right + scrollX,
    };
  }

  /**
   * Dispatches input events using native prototype setters so React's SyntheticEvent system registers the change
   */
  private dispatchReactInputEvent(
    element: HTMLElement,
    value: string | boolean,
    property: 'value' | 'checked'
  ): void {
    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, property);

    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      (element as any)[property] = value;
    }

    // Dispatch native bubbled events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
