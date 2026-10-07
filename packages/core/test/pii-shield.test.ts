import { describe, it, expect } from 'vitest';
import { PIIShield } from '../src/security/pii-shield';

describe('PIIShield', () => {
  const shield = new PIIShield();

  it('masks password fields by type', () => {
    const input = document.createElement('input');
    input.type = 'password';
    input.value = 'superSecret123!';

    expect(shield.isSensitiveField(input)).toBe(true);
    expect(shield.maskValue(input.value)).toBe('••••••••••••');
  });

  it('detects sensitive field names (cvv, cc-number, ssn)', () => {
    const cardInput = document.createElement('input');
    cardInput.name = 'credit_card_number';

    const cvvInput = document.createElement('input');
    cvvInput.id = 'cvv_code';

    const ssnInput = document.createElement('input');
    ssnInput.setAttribute('aria-label', 'Social Security Number');

    expect(shield.isSensitiveField(cardInput)).toBe(true);
    expect(shield.isSensitiveField(cvvInput)).toBe(true);
    expect(shield.isSensitiveField(ssnInput)).toBe(true);
  });

  it('detects fields with data-synapse-mask or data-private attributes', () => {
    const customSensitive = document.createElement('input');
    customSensitive.name = 'user_notes';
    customSensitive.setAttribute('data-synapse-mask', 'true');

    expect(shield.isSensitiveField(customSensitive)).toBe(true);
  });

  it('identifies ignored elements with data-synapse-ignore', () => {
    const ignoredDiv = document.createElement('div');
    ignoredDiv.setAttribute('data-synapse-ignore', 'true');

    const innerChild = document.createElement('p');
    ignoredDiv.appendChild(innerChild);

    expect(shield.isIgnoredElement(ignoredDiv)).toBe(true);
    expect(shield.isIgnoredElement(innerChild)).toBe(true);
  });

  it('sanitizes credit cards and SSNs inside free text', () => {
    const dirtyText = 'Customer card is 4532-1234-5678-9010 and SSN is 123-45-6789.';
    const cleanText = shield.sanitizeText(dirtyText);

    expect(cleanText).not.toContain('4532-1234-5678-9010');
    expect(cleanText).not.toContain('123-45-6789');
    expect(cleanText).toContain('••••-••••-••••-9010');
    expect(cleanText).toContain('•••-••-••••');
  });
});
