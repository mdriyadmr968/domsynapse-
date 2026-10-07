import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionDispatcher } from '../src/actions/action-dispatcher';

describe('ActionDispatcher', () => {
  let dispatcher: ActionDispatcher;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="test-form">
        <input id="test-name" name="name" type="text" value="" />
        <input id="test-subscribe" name="subscribe" type="checkbox" />
        <select id="test-country" name="country">
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="UK">United Kingdom</option>
        </select>
      </form>
    `;
    dispatcher = new ActionDispatcher(document);
  });

  it('updates text input value and dispatches input/change events', () => {
    const input = document.getElementById('test-name') as HTMLInputElement;
    const inputHandler = vi.fn();
    input.addEventListener('input', inputHandler);

    const result = dispatcher.setFieldValue(input, 'Ada Lovelace');

    expect(result).toBe(true);
    expect(input.value).toBe('Ada Lovelace');
    expect(inputHandler).toHaveBeenCalled();
  });

  it('updates checkbox state', () => {
    const checkbox = document.getElementById('test-subscribe') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    dispatcher.setFieldValue(checkbox, 'true');
    expect(checkbox.checked).toBe(true);
  });

  it('updates select dropdown value', () => {
    const select = document.getElementById('test-country') as HTMLSelectElement;
    expect(select.value).toBe('US');

    dispatcher.setFieldValue(select, 'CA');
    expect(select.value).toBe('CA');
  });

  it('executes batch FormFillAction with ActionResult', () => {
    const result = dispatcher.execute({
      type: 'fill_form',
      fields: [
        { selector: '#test-name', value: 'Grace Hopper' },
        { selector: '#test-country', value: 'UK' },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.appliedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.snapshot).toBeDefined();

    const input = document.getElementById('test-name') as HTMLInputElement;
    const select = document.getElementById('test-country') as HTMLSelectElement;

    expect(input.value).toBe('Grace Hopper');
    expect(select.value).toBe('UK');
  });

  it('supports undoing and redoing batch action', () => {
    const input = document.getElementById('test-name') as HTMLInputElement;
    input.value = 'Initial Value';

    dispatcher.execute({
      type: 'fill_form',
      fields: [{ selector: '#test-name', value: 'Mutated Value' }],
    });
    expect(input.value).toBe('Mutated Value');
    expect(dispatcher.canUndo()).toBe(true);

    const undone = dispatcher.undo();
    expect(undone).toBe(true);
    expect(input.value).toBe('Initial Value');
    expect(dispatcher.canRedo()).toBe(true);

    const redone = dispatcher.redo();
    expect(redone).toBe(true);
    expect(input.value).toBe('Mutated Value');
  });

  it('handles validation failure before applying changes', () => {
    const result = dispatcher.execute({
      type: 'fill_form',
      fields: [{ selector: '#non-existent-field', value: 'some value' }],
    });

    expect(result.success).toBe(false);
    expect(result.appliedCount).toBe(0);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});
