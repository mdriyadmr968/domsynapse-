import React from 'react';
import '@domsynapse/react/styles.css';

export const metadata = {
  title: 'DomSynapse — Neural Context-Aware In-App AI Copilot',
  description: 'Interactive demo showing DomSynapse observing DOM, masking PII, and performing actions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          background: '#f8fafc',
          color: '#0f172a',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
