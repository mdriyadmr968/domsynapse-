import {
  DomSynapseAction,
  FormFillAction,
  ActionResult,
  FormSnapshot,
} from '../types';
import { ActionValidator } from './action-validator';
import { FormStateManager } from './form-state-manager';

export interface SpotlightBounds {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export interface ActionExecuteOptions {
  /**
   * Whether to record snapshot before execution for undo/rollback (default: true)
   */
  recordUndo?: boolean;
  /**
   * Whether to validate DOM elements before applying (default: true)
   */
  validate?: boolean;
}

export class ActionDispatcher {
  private doc: Document;
  private validator: ActionValidator;
  private stateManager: FormStateManager;

  constructor(doc?: Document, stateManager?: FormStateManager) {
    if (doc) {
      this.doc = doc;
    } else if (typeof document !== 'undefined') {
      this.doc = document;
    } else {
      throw new Error('No Document object provided for ActionDispatcher');
    }

    this.validator = new ActionValidator(this.doc);
    this.stateManager = stateManager || new FormStateManager();
  }

  /**
   * Executes a DomSynapse action with validation and automatic rollback snapshotting
   */
  public execute(
    action: DomSynapseAction,
    options: ActionExecuteOptions = { recordUndo: true, validate: true }
  ): ActionResult {
    const shouldValidate = options.validate !== false;
    const shouldRecordUndo = options.recordUndo !== false;

    // 1. Validation check
    if (shouldValidate) {
      const validation = this.validator.validate(action);
      if (!validation.canExecute) {
        return {
          success: false,
          action,
          appliedCount: 0,
          failedCount: action.type === 'fill_form' ? action.fields.length : 1,
          errors: validation.issues.map((i) => i.message),
        };
      }
    }

    // 2. Snapshot capture if filling a form
    let snapshot: FormSnapshot | undefined;
    if (action.type === 'fill_form' && shouldRecordUndo) {
      snapshot = this.stateManager.captureSnapshot(this.doc, action.fields);
    }

    // 3. Execution
    let success = false;
    let appliedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    switch (action.type) {
      case 'fill_form': {
        for (const field of action.fields) {
          let targetEl: HTMLElement | null = null;
          if (field.selector) {
            try {
              targetEl = this.doc.querySelector(field.selector);
            } catch (err: any) {
              failedCount++;
              errors.push(`Invalid selector "${field.selector}": ${err.message}`);
              continue;
            }
          } else if (field.name) {
            targetEl =
              this.doc.querySelector(`[name="${field.name}"][value="${field.value}"]`) ||
              this.doc.querySelector(`[name="${field.name}"]`);
          }

          if (!targetEl) {
            failedCount++;
            errors.push(`Target field "${field.selector || field.name}" not found`);
            continue;
          }

          const fieldSuccess = this.setFieldValue(targetEl, field.value);
          if (fieldSuccess) {
            appliedCount++;
          } else {
            failedCount++;
            errors.push(`Failed to set value on "${field.selector || field.name}"`);
          }
        }

        success = appliedCount > 0 && failedCount === 0;
        if (success && snapshot) {
          this.stateManager.pushSnapshot(snapshot);
        }
        break;
      }

      case 'focus':
      case 'spotlight': {
        success = this.focusElement(action.selector);
        if (success) {
          appliedCount = 1;
        } else {
          failedCount = 1;
          errors.push(`Element "${action.selector}" could not be focused`);
        }
        break;
      }

      default:
        return {
          success: false,
          action,
          appliedCount: 0,
          failedCount: 1,
          errors: [`Unknown action type: ${(action as any).type}`],
        };
    }

    return {
      success,
      action,
      appliedCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
      snapshot,
    };
  }

  /**
   * Fills multiple fields specified in a form fill action directly without options
   */
  public executeFormFill(action: FormFillAction): boolean {
    const result = this.execute(action, { recordUndo: true, validate: false });
    return result.success;
  }

  /**
   * Undoes the last form fill action, restoring previous values
   */
  public undo(): boolean {
    const revertedSnapshot = this.stateManager.undo(
      this.doc,
      (el, val) => this.setFieldValue(el, val)
    );
    return revertedSnapshot !== null;
  }

  /**
   * Redoes the last undone form fill action
   */
  public redo(): boolean {
    const reappliedSnapshot = this.stateManager.redo(
      this.doc,
      (el, val) => this.setFieldValue(el, val)
    );
    return reappliedSnapshot !== null;
  }

  /**
   * Rolls back form fields to a specific snapshot
   */
  public rollback(snapshot: FormSnapshot): boolean {
    return this.stateManager.rollback(
      this.doc,
      snapshot,
      (el, val) => this.setFieldValue(el, val)
    );
  }

  public canUndo(): boolean {
    return this.stateManager.canUndo();
  }

  public canRedo(): boolean {
    return this.stateManager.canRedo();
  }

  public getStateManager(): FormStateManager {
    return this.stateManager;
  }

  public getValidator(): ActionValidator {
    return this.validator;
  }

  /**
   * Safely updates an input/textarea/select field triggering React and standard DOM events
   */
  public setFieldValue(element: HTMLElement, value: string): boolean {
    try {
      if (element instanceof HTMLInputElement) {
        if (element.type === 'checkbox' || element.type === 'radio') {
          const shouldCheck =
            value === 'true' || value === '1' || value === 'checked' || element.value === value;
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
