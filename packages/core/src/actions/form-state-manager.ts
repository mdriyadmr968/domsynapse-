import { FieldSnapshotEntry, FormSnapshot } from '../types';

export class FormStateManager {
  private undoStack: FormSnapshot[] = [];
  private redoStack: FormSnapshot[] = [];
  private maxHistory: number;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  /**
   * Captures the current state of the given fields before an action modifies them
   */
  public captureSnapshot(
    doc: Document,
    targets: Array<{ selector?: string; name?: string }>
  ): FormSnapshot {
    const entries: FieldSnapshotEntry[] = [];
    const id = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    for (const target of targets) {
      let el: HTMLElement | null = null;
      let effectiveSelector = target.selector || '';

      if (target.selector) {
        try {
          el = doc.querySelector(target.selector);
        } catch {
          continue;
        }
      } else if (target.name) {
        el =
          doc.querySelector(`input[type="radio"][name="${target.name}"]:checked`) ||
          doc.querySelector(`[name="${target.name}"]`);
        if (!effectiveSelector) {
          if (el?.id) {
            effectiveSelector = `#${el.id}`;
          } else if (el instanceof HTMLInputElement && el.type === 'radio' && el.value) {
            effectiveSelector = `input[name="${target.name}"][value="${el.value}"]`;
          } else {
            effectiveSelector = `[name="${target.name}"]`;
          }
        }
      }

      if (!el) continue;

      let value = '';
      let checked: boolean | undefined = undefined;

      if (el instanceof HTMLInputElement) {
        value = el.value;
        if (el.type === 'checkbox' || el.type === 'radio') {
          checked = el.checked;
        }
      } else if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        value = el.value;
      } else if (el.isContentEditable) {
        value = el.textContent || '';
      }

      entries.push({
        selector: effectiveSelector,
        name: target.name || (el as any).name,
        tagName: el.tagName.toLowerCase(),
        type: (el as any).type,
        previousValue: value,
        previousChecked: checked,
      });
    }

    const snapshot: FormSnapshot = {
      id,
      timestamp: Date.now(),
      entries,
    };

    return snapshot;
  }

  /**
   * Records a snapshot onto the undo history stack
   */
  public pushSnapshot(snapshot: FormSnapshot): void {
    if (snapshot.entries.length === 0) return;

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Any new action clears the redo stack
    this.redoStack = [];
  }

  /**
   * Reverts form state using a snapshot
   */
  public rollback(
    doc: Document,
    snapshot: FormSnapshot,
    setter: (el: HTMLElement, val: string) => boolean
  ): boolean {
    let allRestored = true;

    for (const entry of snapshot.entries) {
      const el = doc.querySelector(entry.selector) as HTMLElement | null;
      if (!el) {
        allRestored = false;
        continue;
      }

      if (entry.previousChecked !== undefined && el instanceof HTMLInputElement) {
        const val = entry.previousChecked ? 'true' : 'false';
        const success = setter(el, val);
        if (!success) allRestored = false;
      } else {
        const success = setter(el, entry.previousValue);
        if (!success) allRestored = false;
      }
    }

    return allRestored;
  }

  /**
   * Undoes the last recorded action and moves the inverted state onto redo stack
   */
  public undo(
    doc: Document,
    setter: (el: HTMLElement, val: string) => boolean
  ): FormSnapshot | null {
    const snapshot = this.undoStack.pop();
    if (!snapshot) return null;

    // Capture the current state before rolling back, so redo can restore it
    const redoSnapshot = this.captureSnapshot(
      doc,
      snapshot.entries.map((e) => ({ selector: e.selector, name: e.name }))
    );

    const success = this.rollback(doc, snapshot, setter);
    if (success && redoSnapshot.entries.length > 0) {
      this.redoStack.push(redoSnapshot);
    }

    return snapshot;
  }

  /**
   * Redoes the last undone action
   */
  public redo(
    doc: Document,
    setter: (el: HTMLElement, val: string) => boolean
  ): FormSnapshot | null {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return null;

    // Capture current state before rolling forward, so undo can revert it
    const undoSnapshot = this.captureSnapshot(
      doc,
      snapshot.entries.map((e) => ({ selector: e.selector, name: e.name }))
    );

    const success = this.rollback(doc, snapshot, setter);
    if (success && undoSnapshot.entries.length > 0) {
      this.undoStack.push(undoSnapshot);
    }

    return snapshot;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoCount(): number {
    return this.undoStack.length;
  }

  public getRedoCount(): number {
    return this.redoStack.length;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
