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
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      setBounds({
        top: rect.top + scrollY,
        left: rect.left + scrollX,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom + scrollY,
        right: rect.right + scrollX,
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
    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds, true);

    return () => {
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds, true);
    };
  }, [spotlight, updateBounds]);

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
