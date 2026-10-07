import React from 'react';
import { useDomSynapse } from '../context/DomSynapseContext';
import { DiffConfirmCardProps } from '../types';

export function DiffConfirmCard({ className = '', onApprove, onReject }: DiffConfirmCardProps) {
  const { pendingAction, pendingDiffChanges, approvePendingAction, rejectPendingAction } =
    useDomSynapse();

  if (!pendingAction || pendingDiffChanges.length === 0) {
    return null;
  }

  const handleApprove = async () => {
    await approvePendingAction();
    onApprove?.();
  };

  const handleReject = () => {
    rejectPendingAction();
    onReject?.();
  };

  return (
    <div className={`synapse-diff-backdrop ${className}`} data-testid="synapse-diff-modal">
      <div className="synapse-diff-card">
        <div className="synapse-diff-header">
          <h3 className="synapse-diff-title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Review Proposed Autofill ({pendingDiffChanges.length} fields)
          </h3>
          <button
            type="button"
            className="synapse-btn-icon"
            onClick={handleReject}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="synapse-diff-body">
          {pendingDiffChanges.map((change, index) => (
            <div key={index} className="synapse-diff-row">
              <span className="synapse-diff-field-name">
                {change.fieldLabel || change.name || change.selector}
              </span>
              <div className="synapse-diff-comparison">
                <span className="synapse-diff-before">
                  {change.previousValue ? change.previousValue : '— (empty)'}
                </span>
                <span>→</span>
                <span className="synapse-diff-after">
                  {change.proposedValue}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="synapse-diff-footer">
          <button type="button" className="synapse-btn-cancel" onClick={handleReject}>
            Discard
          </button>
          <button type="button" className="synapse-btn-confirm" onClick={handleApprove}>
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
