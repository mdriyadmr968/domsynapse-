# Getting Started with DomSynapse 🚀

This step-by-step guide walks you through integrating DomSynapse into an existing React or Next.js application in under 5 minutes.

---

## 1. Install Packages

In your project repository, install the core and React packages:

```bash
pnpm add @domsynapse/core @domsynapse/react
# If you are hosting the backend in Next.js:
pnpm add @domsynapse/server
```

---

## 2. Setup the Backend API Route

Create a server endpoint to process copilot requests and communicate with your AI provider.

### For Next.js (App Router):
Create `app/api/copilot/route.ts`:

```ts
import { createDomSynapseNextHandler } from '@domsynapse/server';

export const POST = createDomSynapseNextHandler({
  provider: 'openai', // 'openai' | 'anthropic' | 'gemini'
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
  stream: true, // Real-time token streaming
});
```

Ensure `OPENAI_API_KEY` is added to your `.env.local`.

---

## 3. Wrap Your Application in `DomSynapseProvider`

In your root layout or entry component, import the CSS stylesheet and wrap your component tree:

### In Next.js `app/layout.tsx`:
```tsx
import React from 'react';
import { DomSynapseProvider, DomSynapseDock } from '@domsynapse/react';
import '@domsynapse/react/styles.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DomSynapseProvider
          apiEndpoint="/api/copilot"
          options={{
            autoObserveForms: true,
            trackInputs: true,
            trackFocus: true,
            enableCrossTabSync: true,
            piiOptions: {
              maskCreditCards: true,
              maskSSN: true,
              maskPasswords: true,
            },
          }}
        >
          {children}

          {/* Collapsible Copilot Dock */}
          <DomSynapseDock
            position="bottom-right"
            title="AI Web Copilot"
            enableVoice={true}
          />
        </DomSynapseProvider>
      </body>
    </html>
  );
}
```

---

## 4. Testing Your Copilot

1. Run your development server:
   ```bash
   pnpm dev
   ```
2. Open any page containing an HTML `<form>` or interactive `<input>` elements.
3. Click the glowing **DomSynapse** badge in the bottom-right corner.
4. Try typing commands such as:
   - *"Fill out this registration form with sample test data."*
   - *"Spotlight the required fields."*
   - *"Help me complete the billing section."*
5. Or click the 🎙️ **Microphone** button to speak your command aloud.
6. When the AI proposes form modifications, inspect the **Diff Preview Card** and click **Apply Changes**.
7. Test the **Undo (↶)** button to immediately revert back to original form values.

---

## 5. Next Steps

- Explore the [API Reference](../api-reference.md) for full configuration parameters.
- Check the [Security & Privacy Guide](../security.md) for custom PII rules.
- Review [Architecture Overview](../architecture.md) for system design details.
