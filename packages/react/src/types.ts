import React from 'react';
import {
  DomSynapseAction,
  FormFillAction,
  SpotlightAction,
  FocusAction,
  PageContext,
  ActionResult,
  SpotlightBounds,
  DOMObserverOptions,
  PIIShieldOptions,
} from '@domsynapse/core';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  action?: DomSynapseAction;
  actionResult?: ActionResult;
  isStreaming?: boolean;
}

export interface DiffFieldChange {
  selector?: string;
  name?: string;
  fieldLabel?: string;
  previousValue: string;
  proposedValue: string;
  previousChecked?: boolean;
  proposedChecked?: boolean;
  tagName: string;
  type?: string;
}

export interface DomSynapseOptions {
  /**
   * Whether to continuously observe DOM changes and forms (default: true)
   */
  autoObserveForms?: boolean;
  /**
   * Enable PII masking for passwords, cards, etc. (default: true)
   */
  piiMasking?: boolean;
  /**
   * Debounce delay for DOM mutations in ms (default: 250)
   */
  debounceMs?: number;
  /**
   * Track focus changes to provide active element context (default: true)
   */
  trackFocus?: boolean;
  /**
   * Track input value changes (default: true)
   */
  trackInputs?: boolean;
  /**
   * CSS selectors to ignore during serialization
   */
  ignoreSelectors?: string[];
  /**
   * Custom PII Shield options
   */
  piiOptions?: PIIShieldOptions;
  /**
   * Enable cross-tab synchronization of undo history and spotlight actions (default: true)
   */
  enableCrossTabSync?: boolean;
}

export interface DomSynapseContextValue {
  /**
   * Active extracted page semantic context
   */
  pageContext: PageContext | null;
  /**
   * Whether the DOM observer is actively monitoring
   */
  isObserving: boolean;
  /**
   * Chat message history
   */
  messages: CopilotMessage[];
  /**
   * Sends a user query to the AI copilot
   */
  sendMessage: (content: string) => Promise<void>;
  /**
   * Pending action awaiting user confirmation (e.g. form autofill diff)
   */
  pendingAction: DomSynapseAction | null;
  /**
   * List of field changes computed for pending form fill action
   */
  pendingDiffChanges: DiffFieldChange[];
  /**
   * Confirms and applies the pending action
   */
  approvePendingAction: () => Promise<ActionResult | null>;
  /**
   * Rejects/cancels the pending action
   */
  rejectPendingAction: () => void;
  /**
   * Active spotlight element and message
   */
  spotlight: { selector: string; message: string; bounds?: SpotlightBounds } | null;
  /**
   * Dismisses the current spotlight overlay
   */
  dismissSpotlight: () => void;
  /**
   * Undoes the last form fill action
   */
  undo: () => boolean;
  /**
   * Redoes the last undone form fill action
   */
  redo: () => boolean;
  /**
   * Whether an action can be undone
   */
  canUndo: boolean;
  /**
   * Whether an action can be redone
   */
  canRedo: boolean;
  /**
   * Whether the copilot dock is open / expanded
   */
  isOpen: boolean;
  /**
   * Toggles or sets dock open state
   */
  setIsOpen: (open: boolean) => void;
  /**
   * Whether an AI query or action is in progress
   */
  isLoading: boolean;
  /**
   * Current error message, if any
   */
  error: string | null;
  /**
   * Clears conversation history
   */
  clearMessages: () => void;
  /**
   * Configured options
   */
  options: DomSynapseOptions;
}

export interface DomSynapseProviderProps {
  children: React.ReactNode;
  /**
   * Backend endpoint URL for AI copilot streaming completions
   */
  apiEndpoint?: string;
  /**
   * Configuration options for observer and PII shield
   */
  options?: DomSynapseOptions;
  /**
   * Custom fetch function (useful for mock testing or custom auth headers)
   */
  customFetch?: (url: string, init?: RequestInit) => Promise<Response>;
  /**
   * Callback fired whenever an action is proposed
   */
  onAction?: (action: DomSynapseAction) => boolean | void | Promise<boolean | void>;
  /**
   * Initial suggestions to populate
   */
  initialMessages?: CopilotMessage[];
}

export interface DomSynapseDockProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  title?: string;
  placeholder?: string;
  suggestedPrompts?: string[];
  className?: string;
  /**
   * If true, disables auto-mounting SpotlightOverlay and DiffConfirmCard
   * (useful when you render them customly in your layout)
   */
  hideOverlayComponents?: boolean;
  /**
   * Whether to enable speech-to-text voice input in the dock bar (default: true)
   */
  enableVoiceInput?: boolean;
}

export interface SpotlightOverlayProps {
  className?: string;
}

export interface DiffConfirmCardProps {
  className?: string;
  onApprove?: () => void;
  onReject?: () => void;
}
