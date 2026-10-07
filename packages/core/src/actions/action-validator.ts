import { DomSynapseAction, ActionValidationResult, ActionValidationIssue } from '../types';

export class ActionValidator {
  private doc: Document;

  constructor(doc?: Document) {
    if (doc) {
      this.doc = doc;
    } else if (typeof document !== 'undefined') {
      this.doc = document;
    } else {
      throw new Error('No Document object provided for ActionValidator');
    }
  }

  /**
   * Validates a DomSynapseAction against the current DOM state before execution
   */
  public validate(action: DomSynapseAction): ActionValidationResult {
    const issues: ActionValidationIssue[] = [];

    switch (action.type) {
      case 'fill_form': {
        if (!action.fields || action.fields.length === 0) {
          issues.push({
            severity: 'error',
            message: 'No fields specified in fill_form action',
          });
          break;
        }

        // If parent form selector is given, check that it exists
        if (action.formSelector) {
          const formEl = this.doc.querySelector(action.formSelector);
          if (!formEl) {
            issues.push({
              selector: action.formSelector,
              severity: 'warning',
              message: `Specified form container "${action.formSelector}" was not found in the DOM`,
            });
          }
        }

        for (const field of action.fields) {
          const identifier = field.selector || (field.name ? `[name="${field.name}"]` : 'unknown');
          let el: HTMLElement | null = null;

          if (field.selector) {
            try {
              el = this.doc.querySelector(field.selector);
            } catch (err: any) {
              issues.push({
                selector: field.selector,
                field: field.name,
                severity: 'error',
                message: `Invalid CSS selector: ${err.message}`,
              });
              continue;
            }
          } else if (field.name) {
            el = this.doc.querySelector(`[name="${field.name}"]`);
          }

          if (!el) {
            issues.push({
              selector: identifier,
              field: field.name,
              severity: 'error',
              message: `Field element "${identifier}" not found in document`,
            });
            continue;
          }

          // Check if field is disabled
          if ((el as any).disabled) {
            issues.push({
              selector: identifier,
              field: field.name,
              severity: 'error',
              message: `Field "${identifier}" is disabled and cannot be filled`,
            });
            continue;
          }

          // Check if field is read-only
          if ((el as any).readOnly) {
            issues.push({
              selector: identifier,
              field: field.name,
              severity: 'error',
              message: `Field "${identifier}" is readOnly and cannot be filled`,
            });
            continue;
          }

          // Check select options validity
          if (el instanceof HTMLSelectElement) {
            const hasOption = Array.from(el.options).some(
              (opt) => opt.value === field.value || opt.text === field.value
            );
            if (!hasOption) {
              issues.push({
                selector: identifier,
                field: field.name,
                severity: 'warning',
                message: `Value "${field.value}" does not match any existing <option> in select element "${identifier}"`,
              });
            }
          }
        }
        break;
      }

      case 'spotlight':
      case 'focus': {
        const selector = action.selector;
        let el: HTMLElement | null = null;

        try {
          el = this.doc.querySelector(selector);
        } catch (err: any) {
          issues.push({
            selector,
            severity: 'error',
            message: `Invalid CSS selector "${selector}": ${err.message}`,
          });
          break;
        }

        if (!el) {
          issues.push({
            selector,
            severity: 'error',
            message: `Target element "${selector}" not found in document`,
          });
        }
        break;
      }

      default:
        issues.push({
          severity: 'error',
          message: `Unknown action type: ${(action as any).type}`,
        });
    }

    const hasErrors = issues.some((i) => i.severity === 'error');
    const valid = issues.length === 0;
    const canExecute = !hasErrors;

    return {
      valid,
      canExecute,
      issues,
    };
  }
}
