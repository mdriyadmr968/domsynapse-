import { describe, it, expect, beforeEach } from 'vitest';
import { ActionValidator } from '../src/actions/action-validator';
import { DomSynapseAction } from '../src/types';

describe('ActionValidator', () => {
  let validator: ActionValidator;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="profile-form">
        <input id="username" name="username" type="text" value="existing_user" />
        <input id="disabled-input" name="disabled_field" type="text" disabled />
        <input id="readonly-input" name="readonly_field" type="text" readonly />
        <select id="country-select" name="country">
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
        <button id="save-btn" type="submit">Save</button>
      </form>
    `;
    validator = new ActionValidator(document);
  });

  it('validates a valid fill_form action successfully', () => {
    const action: DomSynapseAction = {
      type: 'fill_form',
      formSelector: '#profile-form',
      fields: [
        { selector: '#username', value: 'new_username' },
        { selector: '#country-select', value: 'CA' },
      ],
    };

    const res = validator.validate(action);
    expect(res.valid).toBe(true);
    expect(res.canExecute).toBe(true);
    expect(res.issues).toHaveLength(0);
  });

  it('flags error when target element does not exist', () => {
    const action: DomSynapseAction = {
      type: 'fill_form',
      fields: [{ selector: '#non-existent', value: 'value' }],
    };

    const res = validator.validate(action);
    expect(res.valid).toBe(false);
    expect(res.canExecute).toBe(false);
    expect(res.issues.some((i) => i.severity === 'error' && i.message.includes('not found'))).toBe(true);
  });

  it('flags error when target field is disabled', () => {
    const action: DomSynapseAction = {
      type: 'fill_form',
      fields: [{ selector: '#disabled-input', value: 'value' }],
    };

    const res = validator.validate(action);
    expect(res.valid).toBe(false);
    expect(res.canExecute).toBe(false);
    expect(res.issues.some((i) => i.message.includes('is disabled'))).toBe(true);
  });

  it('flags error when target field is read-only', () => {
    const action: DomSynapseAction = {
      type: 'fill_form',
      fields: [{ selector: '#readonly-input', value: 'value' }],
    };

    const res = validator.validate(action);
    expect(res.valid).toBe(false);
    expect(res.canExecute).toBe(false);
    expect(res.issues.some((i) => i.message.includes('is readOnly'))).toBe(true);
  });

  it('emits a warning if select value does not match available options', () => {
    const action: DomSynapseAction = {
      type: 'fill_form',
      fields: [{ selector: '#country-select', value: 'INVALID_COUNTRY' }],
    };

    const res = validator.validate(action);
    // Can still execute (non-fatal), but has a warning issue
    expect(res.valid).toBe(false);
    expect(res.canExecute).toBe(true);
    expect(res.issues.some((i) => i.severity === 'warning' && i.message.includes('does not match'))).toBe(true);
  });

  it('validates spotlight and focus actions', () => {
    const validSpotlight: DomSynapseAction = {
      type: 'spotlight',
      selector: '#save-btn',
      message: 'Click save to continue',
    };
    expect(validator.validate(validSpotlight).canExecute).toBe(true);

    const invalidFocus: DomSynapseAction = {
      type: 'focus',
      selector: '#missing-element',
    };
    const invalidRes = validator.validate(invalidFocus);
    expect(invalidRes.canExecute).toBe(false);
    expect(invalidRes.issues.some((i) => i.message.includes('not found'))).toBe(true);
  });
});
