import {
  ActiveElementContext,
  FormContext,
  FormFieldInfo,
  HeadingContext,
  LandmarkContext,
  PageContext,
  SelectOption,
} from '../types';
import { PIIShield } from '../security/pii-shield';

export interface SemanticSerializerOptions {
  piiShield?: PIIShield;
  ignoreSelectors?: string[];
  maxSummaryLength?: number;
}

export class SemanticSerializer {
  private piiShield: PIIShield;
  private ignoreSelectors: string[];
  private maxSummaryLength: number;

  constructor(options: SemanticSerializerOptions = {}) {
    this.piiShield = options.piiShield ?? new PIIShield();
    this.ignoreSelectors = [
      'script',
      'style',
      'noscript',
      'svg',
      ...(options.ignoreSelectors ?? []),
    ];
    this.maxSummaryLength = options.maxSummaryLength ?? 300;
  }

  /**
   * Serializes the document or a root container element into a structured PageContext
   */
  public serialize(root?: Document | HTMLElement): PageContext {
    const doc = this.resolveDocument(root);
    const container = root instanceof HTMLElement ? root : (doc.body || doc.documentElement);

    const url = typeof window !== 'undefined' ? window.location.href : '';
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const title = doc.title || '';

    const metaDescEl = doc.querySelector('meta[name="description"]');
    const metaDescription = metaDescEl?.getAttribute('content') || undefined;

    const headings = this.extractHeadings(container);
    const landmarks = this.extractLandmarks(container);
    const forms = this.extractForms(container, doc);
    const activeElement = this.extractActiveElement(doc);

    return {
      url,
      path,
      title,
      metaDescription,
      headings,
      landmarks,
      forms,
      activeElement,
      timestamp: Date.now(),
    };
  }

  /**
   * Formats a PageContext into a token-efficient markdown format for LLM system prompts
   */
  public formatForLLM(context: PageContext): string {
    const lines: string[] = [];

    lines.push(`### ACTIVE SCREEN CONTEXT`);
    lines.push(`- **URL/Path**: ${context.path || context.url || '/'}`);
    lines.push(`- **Page Title**: ${context.title || 'Untitled'}`);

    if (context.metaDescription) {
      lines.push(`- **Description**: ${context.metaDescription}`);
    }

    if (context.headings.length > 0) {
      lines.push(`\n#### Page Headings`);
      context.headings.slice(0, 10).forEach((h) => {
        lines.push(`  ${'#'.repeat(Math.min(h.level, 4))} ${h.text}`);
      });
    }

    if (context.activeElement) {
      lines.push(`\n#### Currently Focused Element`);
      lines.push(
        `- Tag: \`${context.activeElement.tagName}\` | Selector: \`${context.activeElement.selector}\`${
          context.activeElement.label ? ` | Label: "${context.activeElement.label}"` : ''
        }`
      );
    }

    if (context.forms.length > 0) {
      lines.push(`\n#### Detected Forms (${context.forms.length})`);
      context.forms.forEach((form, fIdx) => {
        const formTitle = form.name || form.id || `Form #${fIdx + 1}`;
        lines.push(`\n**[${formTitle}]** (Selector: \`${form.selector}\`)`);

        if (form.fields.length === 0) {
          lines.push(`  *(No interactive inputs)*`);
          return;
        }

        form.fields.forEach((field) => {
          const parts: string[] = [];
          parts.push(`- **${field.label || field.name || field.id || 'Field'}**`);
          parts.push(`(\`${field.selector}\`, type=\`${field.type}\`)`);

          if (field.value !== undefined && field.value !== '') {
            parts.push(`value="${field.value}"`);
          } else if (field.placeholder) {
            parts.push(`placeholder="${field.placeholder}"`);
          }

          if (field.checked !== undefined) {
            parts.push(`checked=${field.checked}`);
          }

          if (field.required) parts.push(`[required]`);
          if (field.disabled) parts.push(`[disabled]`);
          if (field.readOnly) parts.push(`[readonly]`);

          if (field.options && field.options.length > 0) {
            const opts = field.options.map((o) => `${o.label}${o.selected ? ' (*)' : ''}`).join(', ');
            parts.push(`options=[${opts}]`);
          }

          if (field.errorText) {
            parts.push(`⚠️ ERROR: "${field.errorText}"`);
          }

          lines.push(`  ${parts.join(' ')}`);
        });
      });
    }

    return lines.join('\n');
  }

  private resolveDocument(root?: Document | HTMLElement): Document {
    if (root && 'nodeType' in root && root.nodeType === 9) {
      return root as Document;
    }
    if (root && root.ownerDocument) {
      return root.ownerDocument;
    }
    if (typeof document !== 'undefined') {
      return document;
    }
    throw new Error('No DOM Document available for serialization');
  }

  private extractHeadings(root: HTMLElement): HeadingContext[] {
    const headings: HeadingContext[] = [];
    const elements = root.querySelectorAll('h1, h2, h3, h4');

    elements.forEach((el) => {
      if (this.piiShield.isIgnoredElement(el)) return;
      const level = parseInt(el.tagName.replace('H', ''), 10) || 1;
      const text = el.textContent?.trim() || '';
      if (text) {
        headings.push({
          level,
          text: this.piiShield.sanitizeText(text),
        });
      }
    });

    return headings;
  }

  private extractLandmarks(root: HTMLElement): LandmarkContext[] {
    const landmarks: LandmarkContext[] = [];
    const landmarkSelectors = 'main, nav, article, aside, dialog, [role="main"], [role="navigation"], [role="dialog"]';
    const elements = root.querySelectorAll(landmarkSelectors);

    elements.forEach((el) => {
      if (this.piiShield.isIgnoredElement(el)) return;
      const role = el.getAttribute('role') || el.tagName.toLowerCase();
      const label = el.getAttribute('aria-label') || el.getAttribute('title') || undefined;
      const summaryText = this.truncateText(el.textContent?.trim() || '', this.maxSummaryLength);

      landmarks.push({
        role,
        selector: this.generateSelector(el),
        label: label ? this.piiShield.sanitizeText(label) : undefined,
        summaryText: summaryText ? this.piiShield.sanitizeText(summaryText) : undefined,
      });
    });

    return landmarks;
  }

  private extractForms(root: HTMLElement, doc: Document): FormContext[] {
    const forms: FormContext[] = [];
    const formElements = Array.from(root.querySelectorAll('form'));

    // Track inputs processed in forms
    const processedInputs = new Set<Element>();

    formElements.forEach((formEl) => {
      if (this.piiShield.isIgnoredElement(formEl)) return;

      const fields = this.extractFieldsFromContainer(formEl, doc, processedInputs);
      forms.push({
        id: formEl.id || undefined,
        name: formEl.getAttribute('name') || undefined,
        selector: this.generateSelector(formEl),
        action: formEl.getAttribute('action') || undefined,
        method: formEl.getAttribute('method') || undefined,
        fields,
      });
    });

    // Check for orphan inputs (inputs outside of <form> tag, common in React/SPAs)
    const allInputSelector = 'input, textarea, select';
    const orphanInputs: Element[] = [];

    root.querySelectorAll(allInputSelector).forEach((el) => {
      if (!processedInputs.has(el) && !this.piiShield.isIgnoredElement(el)) {
        orphanInputs.push(el);
      }
    });

    if (orphanInputs.length > 0) {
      const orphanFields = orphanInputs.map((el) => this.extractFieldInfo(el as HTMLElement, doc));
      forms.push({
        name: 'Page Interactive Fields',
        selector: 'body',
        fields: orphanFields,
      });
    }

    return forms;
  }

  private extractFieldsFromContainer(
    container: HTMLElement,
    doc: Document,
    processedSet: Set<Element>
  ): FormFieldInfo[] {
    const fields: FormFieldInfo[] = [];
    const inputs = container.querySelectorAll('input, textarea, select');

    inputs.forEach((el) => {
      if (this.piiShield.isIgnoredElement(el)) return;
      const type = (el.getAttribute('type') || el.tagName).toLowerCase();
      if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset') return;

      processedSet.add(el);
      fields.push(this.extractFieldInfo(el as HTMLElement, doc));
    });

    return fields;
  }

  private extractFieldInfo(el: HTMLElement, doc: Document): FormFieldInfo {
    const id = el.id || undefined;
    const name = el.getAttribute('name') || undefined;
    const selector = this.generateSelector(el);
    const tagName = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || tagName).toLowerCase();
    const required = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
    const disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
    const readOnly = el.hasAttribute('readonly');
    const placeholder = el.getAttribute('placeholder') || undefined;

    // Label resolution
    const label = this.resolveLabel(el, doc);

    // Value resolution with PII masking
    let value: string | undefined;
    let checked: boolean | undefined;

    const isSensitive = this.piiShield.isSensitiveField(el);

    if (type === 'checkbox' || type === 'radio') {
      checked = (el as HTMLInputElement).checked;
      value = (el as HTMLInputElement).value;
    } else if (tagName === 'select') {
      const select = el as HTMLSelectElement;
      value = select.value;
    } else {
      const rawValue = (el as HTMLInputElement).value;
      if (rawValue) {
        value = isSensitive ? this.piiShield.maskValue(rawValue) : this.piiShield.sanitizeText(rawValue);
      }
    }

    // Select options
    let options: SelectOption[] | undefined;
    if (tagName === 'select') {
      const select = el as HTMLSelectElement;
      options = Array.from(select.options).slice(0, 20).map((opt) => ({
        value: opt.value,
        label: opt.text.trim(),
        selected: opt.selected,
      }));
    }

    // Error detection
    const errorText = this.resolveError(el, doc);

    return {
      id,
      name,
      selector,
      type,
      label: label ? this.piiShield.sanitizeText(label) : undefined,
      placeholder: placeholder ? this.piiShield.sanitizeText(placeholder) : undefined,
      value,
      checked,
      required,
      disabled,
      readOnly,
      errorText: errorText ? this.piiShield.sanitizeText(errorText) : undefined,
      options,
    };
  }

  private resolveLabel(el: HTMLElement, doc: Document): string | undefined {
    // 1. Check aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel?.trim()) return ariaLabel.trim();

    // 2. Check aria-labelledby
    const ariaLabelledby = el.getAttribute('aria-labelledby');
    if (ariaLabelledby) {
      const labelEl = doc.getElementById(ariaLabelledby);
      if (labelEl?.textContent?.trim()) return labelEl.textContent.trim();
    }

    // 3. Check <label for="id">
    if (el.id) {
      const labelEl = doc.querySelector(`label[for="${el.id}"]`);
      if (labelEl?.textContent?.trim()) return labelEl.textContent.trim();
    }

    // 4. Check wrapping <label>
    const parentLabel = el.closest('label');
    if (parentLabel) {
      // Clone label and remove input node to extract text only
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('input, select, textarea').forEach((n) => n.remove());
      const labelText = clone.textContent?.trim();
      if (labelText) return labelText;
    }

    // 5. Fallback to title or placeholder
    return el.getAttribute('title') || el.getAttribute('placeholder') || undefined;
  }

  private resolveError(el: HTMLElement, doc: Document): string | undefined {
    // 1. Check aria-invalid
    const isInvalid = el.getAttribute('aria-invalid') === 'true';

    // 2. Check aria-describedby
    const describedBy = el.getAttribute('aria-describedby');
    if (describedBy) {
      const descEl = doc.getElementById(describedBy);
      if (descEl?.textContent?.trim()) {
        const text = descEl.textContent.trim();
        // If element is invalid or text contains error/warning cues
        if (isInvalid || /error|invalid|required/i.test(descEl.className + ' ' + text)) {
          return text;
        }
      }
    }

    // 3. Search adjacent siblings or parent for error message elements
    const parent = el.parentElement;
    if (parent) {
      const errorEl = parent.querySelector('.error, .error-message, .invalid-feedback, [role="alert"]');
      if (errorEl && errorEl !== el && errorEl.textContent?.trim()) {
        return errorEl.textContent.trim();
      }
    }

    return isInvalid ? 'Field has a validation error' : undefined;
  }

  private extractActiveElement(doc: Document): ActiveElementContext | undefined {
    const active = doc.activeElement;
    if (!active || active === doc.body || active === doc.documentElement) {
      return undefined;
    }

    const tagName = active.tagName.toLowerCase();
    const selector = this.generateSelector(active);
    const label = active instanceof HTMLElement ? this.resolveLabel(active, doc) : undefined;
    const inputType = active.getAttribute('type') || undefined;

    let currentValue: string | undefined;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      currentValue = this.piiShield.isSensitiveField(active)
        ? this.piiShield.maskValue(active.value)
        : active.value;
    }

    return {
      tagName,
      selector,
      label,
      currentValue,
      inputType,
    };
  }

  /**
   * Generates a robust, readable CSS selector for target element
   */
  public generateSelector(el: Element): string {
    if (el.id) {
      const safeId =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(el.id)
          : el.id;
      return `#${safeId}`;
    }

    const name = el.getAttribute('name');
    if (name) {
      const tag = el.tagName.toLowerCase();
      const type = el.getAttribute('type')?.toLowerCase();
      const val = el.getAttribute('value');
      if (type === 'radio' && val) {
        return `${tag}[name="${name}"][value="${val}"]`;
      }
      return `${tag}[name="${name}"]`;
    }

    const role = el.getAttribute('role');
    if (role) {
      return `[role="${role}"]`;
    }

    // Build path
    const tag = el.tagName.toLowerCase();
    const parent = el.parentElement;
    if (!parent) return tag;

    const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      return `${tag}:nth-of-type(${index})`;
    }

    return tag;
  }

  private truncateText(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.slice(0, max) + '...';
  }
}
