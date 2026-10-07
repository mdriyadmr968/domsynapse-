import { describe, it, expect, beforeEach } from 'vitest';
import { FormStateManager } from '../src/actions/form-state-manager';

describe('FormStateManager', () => {
  let stateManager: FormStateManager;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="user-form">
        <input id="name" name="name" type="text" value="Original Name" />
        <input id="newsletter" name="newsletter" type="checkbox" checked />
        <select id="role" name="role">
          <option value="user" selected>User</option>
          <option value="admin">Admin</option>
        </select>
      </form>
    `;
    stateManager = new FormStateManager(10);
  });

  it('captures an accurate snapshot of multiple form inputs', () => {
    const snapshot = stateManager.captureSnapshot(document, [
      { selector: '#name' },
      { selector: '#newsletter' },
      { selector: '#role' },
    ]);

    expect(snapshot.entries).toHaveLength(3);
    expect(snapshot.entries[0].previousValue).toBe('Original Name');
    expect(snapshot.entries[1].previousChecked).toBe(true);
    expect(snapshot.entries[2].previousValue).toBe('user');
  });

  it('rolls back modified fields to original snapshot values', () => {
    const snapshot = stateManager.captureSnapshot(document, [
      { selector: '#name' },
      { selector: '#newsletter' },
    ]);

    const nameInput = document.getElementById('name') as HTMLInputElement;
    const newsletterInput = document.getElementById('newsletter') as HTMLInputElement;

    nameInput.value = 'Mutated Name';
    newsletterInput.checked = false;

    const rollbackSuccess = stateManager.rollback(document, snapshot, (el, val) => {
      if (el instanceof HTMLInputElement) {
        if (el.type === 'checkbox') {
          el.checked = val === 'true';
        } else {
          el.value = val;
        }
        return true;
      }
      return false;
    });

    expect(rollbackSuccess).toBe(true);
    expect(nameInput.value).toBe('Original Name');
    expect(newsletterInput.checked).toBe(true);
  });

  it('supports undo and redo cycles', () => {
    const nameInput = document.getElementById('name') as HTMLInputElement;

    const setter = (el: HTMLElement, val: string) => {
      if (el instanceof HTMLInputElement) {
        el.value = val;
        return true;
      }
      return false;
    };

    // Step 1: Capture initial state and mutate
    const snap1 = stateManager.captureSnapshot(document, [{ selector: '#name' }]);
    stateManager.pushSnapshot(snap1);
    nameInput.value = 'Step 1 Value';

    expect(stateManager.canUndo()).toBe(true);
    expect(stateManager.canRedo()).toBe(false);

    // Step 2: Undo reverts to Original Name
    const undone = stateManager.undo(document, setter);
    expect(undone).not.toBeNull();
    expect(nameInput.value).toBe('Original Name');
    expect(stateManager.canRedo()).toBe(true);

    // Step 3: Redo restores Step 1 Value
    const redone = stateManager.redo(document, setter);
    expect(redone).not.toBeNull();
    expect(nameInput.value).toBe('Step 1 Value');
  });

  it('clears redo stack upon pushing a new snapshot', () => {
    const snap1 = stateManager.captureSnapshot(document, [{ selector: '#name' }]);
    stateManager.pushSnapshot(snap1);
    stateManager.undo(document, () => true);
    expect(stateManager.canRedo()).toBe(true);

    // Push new snapshot
    const snap2 = stateManager.captureSnapshot(document, [{ selector: '#name' }]);
    stateManager.pushSnapshot(snap2);
    expect(stateManager.canRedo()).toBe(false);
  });
});
