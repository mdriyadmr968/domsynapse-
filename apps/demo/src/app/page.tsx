'use client';

import React, { useState } from 'react';
import { DomSynapseProvider, DomSynapseDock } from '@domsynapse/react';

export default function DemoPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <DomSynapseProvider
      apiEndpoint="/api/copilot"
      options={{
        autoObserveForms: true,
        piiMasking: true,
        trackFocus: true,
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Header */}
        <header style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '18px',
              }}
            >
              DS
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>
                DomSynapse Interactive Playground
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                Neural Context-Aware In-App AI Copilot with Real-time Screen Vision & Two-Way Actions
              </p>
            </div>
          </div>
        </header>

        {/* Content Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 340px',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* Main Form Card */}
          <main
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '28px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700 }}>
              Company Onboarding Form
            </h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b' }}>
              Fill in your account details. You can ask DomSynapse at the bottom right to autofill
              these fields for you or spotlight specific elements!
            </p>

            {submitted && (
              <div
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                ✓ Form successfully submitted!
              </div>
            )}

            <form id="onboarding-form" onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="full-name"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="full-name"
                    name="fullName"
                    type="text"
                    placeholder="e.g. Alex Mercer"
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Work Email */}
                <div>
                  <label
                    htmlFor="work-email"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    Work Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="work-email"
                    name="workEmail"
                    type="email"
                    placeholder="alex@company.com"
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label
                    htmlFor="company"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    Company Name
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    placeholder="Acme Inc."
                    style={inputStyle}
                  />
                </div>

                {/* City */}
                <div>
                  <label
                    htmlFor="city"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    City
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    placeholder="San Francisco"
                    style={inputStyle}
                  />
                </div>

                {/* State */}
                <div>
                  <label
                    htmlFor="state"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    State / Region
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    placeholder="CA"
                    style={inputStyle}
                  />
                </div>

                {/* Plan Tier */}
                <div>
                  <label
                    htmlFor="plan-select"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    Subscription Plan
                  </label>
                  <select id="plan-select" name="plan" style={inputStyle}>
                    <option value="starter">Starter ($29/mo)</option>
                    <option value="pro">Pro ($79/mo)</option>
                    <option value="enterprise">Enterprise ($299/mo)</option>
                  </select>
                </div>
              </div>

              {/* Sensitive Masked Field Demo */}
              <div style={{ marginTop: '20px' }}>
                <label
                  htmlFor="api-key-input"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                >
                  Secret API Key (PII Masking Demo)
                </label>
                <input
                  id="api-key-input"
                  name="apiKey"
                  type="password"
                  placeholder="sk-live-xxxxxxxxxxxx"
                  data-synapse-mask="true"
                  style={inputStyle}
                />
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  This field is tagged with <code>data-synapse-mask</code>. DomSynapse will redact it from LLM prompts.
                </span>
              </div>

              {/* Terms Checkbox */}
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input id="agree-terms" name="agreeTerms" type="checkbox" style={{ cursor: 'pointer' }} />
                <label htmlFor="agree-terms" style={{ fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                  I agree to the Terms of Service and Privacy Policy
                </label>
              </div>

              {/* Submit Button */}
              <div style={{ marginTop: '28px', display: 'flex', gap: '12px' }}>
                <button
                  id="submit-btn"
                  type="submit"
                  style={{
                    background: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save and Submit
                </button>
              </div>
            </form>
          </main>

          {/* Sidebar Info Card */}
          <aside
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700 }}>
              Try Copilot Features
            </h3>
            <ul
              style={{
                margin: '0 0 20px 0',
                paddingLeft: '18px',
                fontSize: '13px',
                color: '#475569',
                lineHeight: 1.6,
              }}
            >
              <li>
                <strong>Two-Way Autofill:</strong> Click the copilot dock and choose{' '}
                <em>"Help me fill this form"</em>. Notice the diff preview before applying!
              </li>
              <li>
                <strong>Spotlight Glow:</strong> Ask <em>"Where is the submit button?"</em> to see
                animated element spotlighting.
              </li>
              <li>
                <strong>State Rollback:</strong> After applying an autofill, test the{' '}
                <em>"Undo last fill"</em> button inside the dock.
              </li>
            </ul>

            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: '#f1f5f9',
                fontSize: '12px',
                color: '#334155',
              }}
            >
              💡 <strong>Framework Agnostic:</strong> Works with React, Next.js, Vue, Svelte, or plain HTML.
            </div>
          </aside>
        </div>

        {/* DomSynapse Floating Copilot Dock */}
        <DomSynapseDock
          position="bottom-right"
          title="DomSynapse"
          suggestedPrompts={[
            'Help me fill this form',
            'Where is the submit button?',
            'What fields are on this page?',
          ]}
        />
      </div>
    </DomSynapseProvider>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  outline: 'none',
  background: '#ffffff',
};
