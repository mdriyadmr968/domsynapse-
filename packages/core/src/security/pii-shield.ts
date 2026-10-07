import { PIIShieldOptions } from '../types';

/**
 * Standard patterns matching sensitive field names (case-insensitive)
 */
const DEFAULT_SENSITIVE_NAMES = [
  /pass(word)?/i,
  /pwd/i,
  /secret/i,
  /token/i,
  /api[_\s-]?key/i,
  /auth/i,
  /card[_\s-]?num(ber)?/i,
  /cc[_\s-]?num(ber)?/i,
  /cvv/i,
  /cvc/i,
  /ssn/i,
  /social[_\s-]?sec(urity)?/i,
  /tax[_\s-]?id/i,
  /pin/i,
  /routing[_\s-]?num(ber)?/i,
  /account[_\s-]?num(ber)?/i,
];

/**
 * Standard autocomplete values identifying sensitive fields
 */
const DEFAULT_SENSITIVE_AUTOCOMPLETE = [
  'current-password',
  'new-password',
  'cc-number',
  'cc-csc',
  'cc-exp',
  'cc-type',
  'one-time-code',
];

/**
 * Regex patterns for inline text sanitization
 */
const CREDIT_CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
const SSN_REGEX = /\b\d{3}[ -]?\d{2}[ -]?\d{4}\b/g;
const GENERIC_API_KEY_REGEX = /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{30,}|AIza[0-9A-Za-z-_]{35})\b/g;

export class PIIShield {
  private maskChar: string;
  private sensitiveFieldNames: (string | RegExp)[];
  private maskAttributes: string[];
  private ignoreAttributes: string[];
  private customPatterns: { name: string; pattern: RegExp; mask?: string }[];

  constructor(options: PIIShieldOptions = {}) {
    this.maskChar = options.maskChar ?? '•';
    this.sensitiveFieldNames = [
      ...DEFAULT_SENSITIVE_NAMES,
      ...(options.sensitiveFieldNames ?? []),
    ];
    this.maskAttributes = [
      'data-synapse-mask',
      'data-lens-mask',
      'data-private',
      ...(options.maskAttributes ?? []),
    ];
    this.ignoreAttributes = [
      'data-synapse-ignore',
      'data-lens-ignore',
      ...(options.ignoreAttributes ?? []),
    ];
    this.customPatterns = options.customPatterns ?? [];
  }

  /**
   * Checks whether an HTML element or field descriptor should be masked
   */
  public isSensitiveField(
    elementOrField:
      | Element
      | {
          name?: string;
          type?: string;
          id?: string;
          autocomplete?: string;
          hasMaskAttr?: boolean;
        }
  ): boolean {
    if ('getAttribute' in elementOrField) {
      const el = elementOrField as Element;
      // Check mask attributes
      for (const attr of this.maskAttributes) {
        if (el.hasAttribute(attr)) return true;
      }

      // Check input type
      const type = el.getAttribute('type')?.toLowerCase();
      if (type === 'password') return true;

      // Check autocomplete
      const autocomplete = el.getAttribute('autocomplete')?.toLowerCase();
      if (autocomplete && DEFAULT_SENSITIVE_AUTOCOMPLETE.includes(autocomplete)) {
        return true;
      }

      // Check name, id, and aria-label against sensitive names
      const name = el.getAttribute('name') || '';
      const id = el.getAttribute('id') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';

      return this.matchesSensitiveName(`${name} ${id} ${ariaLabel}`);
    }

    // Object descriptor check
    if (elementOrField.hasMaskAttr) return true;
    if (elementOrField.type?.toLowerCase() === 'password') return true;
    if (
      elementOrField.autocomplete &&
      DEFAULT_SENSITIVE_AUTOCOMPLETE.includes(elementOrField.autocomplete.toLowerCase())
    ) {
      return true;
    }

    const testStr = `${elementOrField.name ?? ''} ${elementOrField.id ?? ''}`;
    return this.matchesSensitiveName(testStr);
  }

  /**
   * Checks if an element should be completely ignored from context
   */
  public isIgnoredElement(element: Element): boolean {
    for (const attr of this.ignoreAttributes) {
      if (element.hasAttribute(attr) || element.closest(`[${attr}]`)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Masks a field value
   */
  public maskValue(value: string | undefined): string {
    if (!value) return '';
    return this.maskChar.repeat(Math.min(value.length, 12));
  }

  /**
   * Sanitizes generic text strings by masking inline cards, SSNs, and API keys
   */
  public sanitizeText(text: string): string {
    if (!text) return '';

    let sanitized = text;

    // Mask Credit Cards
    sanitized = sanitized.replace(CREDIT_CARD_REGEX, (match) => {
      const last4 = match.replace(/\D/g, '').slice(-4);
      return `••••-••••-••••-${last4}`;
    });

    // Mask SSNs
    sanitized = sanitized.replace(SSN_REGEX, '•••-••-••••');

    // Mask API Keys
    sanitized = sanitized.replace(GENERIC_API_KEY_REGEX, '••••[REDACTED_API_KEY]••••');

    // Run custom patterns
    for (const item of this.customPatterns) {
      sanitized = sanitized.replace(item.pattern, item.mask ?? '••••');
    }

    return sanitized;
  }

  private matchesSensitiveName(text: string): boolean {
    if (!text.trim()) return false;
    for (const matcher of this.sensitiveFieldNames) {
      if (typeof matcher === 'string') {
        if (text.toLowerCase().includes(matcher.toLowerCase())) return true;
      } else if (matcher.test(text)) {
        return true;
      }
    }
    return false;
  }
}
