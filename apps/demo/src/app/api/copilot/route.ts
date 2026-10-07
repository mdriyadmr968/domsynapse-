import { createDomSynapseNextHandler, DomSynapseHandler } from '@domsynapse/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // If user provides an OPENAI_API_KEY, use the live edge handler
  if (process.env.OPENAI_API_KEY) {
    const liveHandler = createDomSynapseNextHandler({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
    });
    return liveHandler(req);
  }

  // Otherwise, provide mock contextual copilot responses for demo testing
  try {
    const body = await req.json();
    const { message, pageContext } = body;
    const lower = (message || '').toLowerCase();

    let reply = `I observed this page ("${pageContext?.title || 'Active Page'}") with ${
      pageContext?.forms?.length || 0
    } form(s).`;
    let action: any = undefined;

    if (lower.includes('fill') || lower.includes('autofill') || lower.includes('complete')) {
      reply =
        'I analyzed your onboarding form and generated autofill values for your profile. Please review the proposed values below.';
      action = {
        type: 'fill_form',
        formSelector: '#onboarding-form',
        fields: [
          { selector: '#full-name', value: 'Alex Mercer', fieldLabel: 'Full Name' },
          { selector: '#work-email', value: 'alex.mercer@synapse.ai', fieldLabel: 'Work Email' },
          { selector: '#company', value: 'Neural Corp', fieldLabel: 'Company Name' },
          { selector: '#city', value: 'San Francisco', fieldLabel: 'City' },
          { selector: '#state', value: 'CA', fieldLabel: 'State' },
          { selector: '#plan-select', value: 'enterprise', fieldLabel: 'Plan Tier' },
          { selector: '#agree-terms', value: 'true', fieldLabel: 'Terms & Conditions' },
        ],
      };
    } else if (lower.includes('submit') || lower.includes('button') || lower.includes('where')) {
      reply = 'The submit button is located at the bottom of the form.';
      action = {
        type: 'spotlight',
        selector: '#submit-btn',
        message: 'Click this button to save and submit your onboarding details.',
      };
    } else if (lower.includes('api key') || lower.includes('secret') || lower.includes('mask')) {
      reply = 'Here is the sensitive API key configuration field. Notice that DomSynapse PII Shield masks its contents.';
      action = {
        type: 'spotlight',
        selector: '#api-key-input',
        message: 'This field has data-synapse-mask active for confidential data protection.',
      };
    } else {
      reply = `I am your in-app copilot. You can ask me to "autofill the form", "where is the submit button?", or ask any question about the inputs on this page!`;
    }

    return new Response(JSON.stringify({ reply, action }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
