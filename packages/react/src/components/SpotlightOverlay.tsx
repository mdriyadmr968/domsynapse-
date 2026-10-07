import React, { useEffect, useState, useCallback } from 'react';
import { useDomSynapse } from '../context/DomSynapseContext';
import { SpotlightOverlayProps } from '../types';
import { SpotlightBounds } from '@domsynapse/core';

export function SpotlightOverlay({ className = '' }: SpotlightOverlayProps) {
  const { spotlight, dismissSpotlight } = useDomSynapse();
  const [bounds, setBounds] = useState<SpotlightBounds | null>(null);

  const updateBounds = useCallback(() => {
    if (!spotlight?.selector || typeof document === 'undefined') return;

    try {
      const el = document.querySelector(spotlight.selector);
      if (!el) {
        setBounds(null);
        return;
      }

      const rect = el.getBoundingClientRect();

      setBounds({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      });
    } catch {
      setBounds(null);
    }
  }, [spotlight?.selector]);

  useEffect(() => {
    if (!spotlight) {
      setBounds(null);
      return;
    }

    updateBounds();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissSpotlight();
      }
    };

    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [spotlight, updateBounds, dismissSpotlight]);

  if (!spotlight || !bounds) return null;

  return (
    <div className={`synapse-spotlight-backdrop ${className}`} data-testid="synapse-spotlight">
      <div
        className="synapse-spotlight-box"
        style={{
          top: `${bounds.top - 4}px`,
          left: `${bounds.left - 4}px`,
          width: `${bounds.width + 8}px`,
          height: `${bounds.height + 8}px`,
        }}
      >
        <div className="synapse-spotlight-card">
          <div className="synapse-spotlight-text">{spotlight.message}</div>
          <button
            type="button"
            className="synapse-spotlight-dismiss-btn"
            onClick={dismissSpotlight}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
