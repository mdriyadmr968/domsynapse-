/**
 * Options for a select element dropdown option
 */
export interface SelectOption {
  value: string;
  label: string;
  selected: boolean;
}

/**
 * Information extracted from a single form field
 */
export interface FormFieldInfo {
  id?: string;
  name?: string;
  selector: string;
  type: string;
  label?: string;
  placeholder?: string;
  value?: string;
  checked?: boolean;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  errorText?: string;
  options?: SelectOption[];
  ariaDescription?: string;
}

/**
 * Representation of a detected form on the active page
 */
export interface FormContext {
  id?: string;
  name?: string;
  selector: string;
  action?: string;
  method?: string;
  fields: FormFieldInfo[];
}

/**
 * Structural heading hierarchy (h1-h6)
 */
export interface HeadingContext {
  level: number;
  text: string;
}

/**
 * Major landmark regions (main, nav, article, dialog, etc.)
 */
export interface LandmarkContext {
  role: string;
  selector: string;
  label?: string;
  summaryText?: string;
}

/**
 * Active element context (what is focused / interacted with right now)
 */
export interface ActiveElementContext {
  tagName: string;
  selector: string;
  label?: string;
  currentValue?: string;
  inputType?: string;
}

/**
 * Full page context extracted by ContextLens
 */
export interface PageContext {
  url: string;
  path: string;
  title: string;
  metaDescription?: string;
  headings: HeadingContext[];
  landmarks: LandmarkContext[];
  forms: FormContext[];
  activeElement?: ActiveElementContext;
  timestamp: number;
}

/**
 * Options for PII Shield
 */
export interface PIIShieldOptions {
  /**
   * Character to use when masking values (default: '*')
   */
  maskChar?: string;
  /**
   * Extra field names/patterns to treat as sensitive
   */
  sensitiveFieldNames?: (string | RegExp)[];
  /**
   * Extra regex patterns to detect sensitive data inside text
   */
  customPatterns?: { name: string; pattern: RegExp; mask?: string }[];
  /**
   * Custom attribute names indicating sensitive elements (default: ['data-synapse-mask', 'data-lens-mask', 'data-private'])
   */
  maskAttributes?: string[];
  /**
   * Custom attribute names indicating elements to completely ignore (default: ['data-synapse-ignore', 'data-lens-ignore'])
   */
  ignoreAttributes?: string[];
}

/**
 * Options for DOMObserver
 */
export interface DOMObserverOptions {
  /**
   * Root element to monitor (defaults to window.document)
   */
  root?: Document | HTMLElement;
  /**
   * Debounce time in ms before triggering onContextChange (default: 250)
   */
  debounceMs?: number;
  /**
   * Whether to monitor focus changes (default: true)
   */
  trackFocus?: boolean;
  /**
   * Whether to monitor input value changes (default: true)
   */
  trackInputs?: boolean;
  /**
   * Selectors to ignore during serialization/observation
   */
  ignoreSelectors?: string[];
  /**
   * PII Shield options
   */
  piiOptions?: PIIShieldOptions;
}

/**
 * Action / Tool representation for LLM function calling
 */
export interface FormFillAction {
  type: 'fill_form';
  formSelector?: string;
  fields: {
    selector?: string;
    name?: string;
    value: string;
    fieldLabel?: string;
  }[];
}

export interface SpotlightAction {
  type: 'spotlight';
  selector: string;
  message: string;
}

export interface FocusAction {
  type: 'focus';
  selector: string;
}

export type DomSynapseAction = FormFillAction | SpotlightAction | FocusAction;
export type ContextLensAction = DomSynapseAction; // Alias for backward compatibility

/**
 * Snapshot of a single form field's state before modification
 */
export interface FieldSnapshotEntry {
  selector: string;
  name?: string;
  tagName: string;
  type?: string;
  previousValue: string;
  previousChecked?: boolean;
}

/**
 * Snapshot of form state for undo/rollback capability
 */
export interface FormSnapshot {
  id: string;
  timestamp: number;
  entries: FieldSnapshotEntry[];
}

/**
 * Result of validating an action before execution
 */
export interface ActionValidationIssue {
  field?: string;
  selector?: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface ActionValidationResult {
  valid: boolean;
  canExecute: boolean;
  issues: ActionValidationIssue[];
}

/**
 * Result of executing an action
 */
export interface ActionResult {
  success: boolean;
  action: DomSynapseAction;
  appliedCount: number;
  failedCount: number;
  errors?: string[];
  snapshot?: FormSnapshot;
}

/**
 * Standard LLM Tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

