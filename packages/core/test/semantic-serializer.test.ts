import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticSerializer } from '../src/serializer/semantic-serializer';

describe('SemanticSerializer', () => {
  let serializer: SemanticSerializer;

  beforeEach(() => {
    document.body.innerHTML = '';
    serializer = new SemanticSerializer();
  });

  it('extracts page title and headings hierarchy', () => {
    document.title = 'User Profile Settings';
    document.body.innerHTML = `
      <h1>Account Overview</h1>
      <h2>Security Preferences</h2>
      <p>Manage your account settings below.</p>
    `;

    const context = serializer.serialize();

    expect(context.title).toBe('User Profile Settings');
    expect(context.headings).toHaveLength(2);
    expect(context.headings[0]).toEqual({ level: 1, text: 'Account Overview' });
    expect(context.headings[1]).toEqual({ level: 2, text: 'Security Preferences' });
  });

  it('extracts forms with labels, values, and validation errors', () => {
    document.body.innerHTML = `
      <form id="profile-form">
        <label for="username">User Name</label>
        <input id="username" name="username" type="text" value="alice_wonder" required />

        <label>
          Email Address
          <input name="email" type="email" placeholder="you@domain.com" aria-invalid="true" aria-describedby="email-err" />
        </label>
        <div id="email-err" class="error-message">Invalid email address format</div>

        <label for="role">Role</label>
        <select id="role" name="role">
          <option value="admin">Administrator</option>
          <option value="editor" selected>Editor</option>
        </select>
      </form>
    `;

    const context = serializer.serialize();

    expect(context.forms).toHaveLength(1);
    const form = context.forms[0];
    expect(form.id).toBe('profile-form');
    expect(form.fields).toHaveLength(3);

    // Field 1: Username
    expect(form.fields[0].name).toBe('username');
    expect(form.fields[0].label).toBe('User Name');
    expect(form.fields[0].value).toBe('alice_wonder');
    expect(form.fields[0].required).toBe(true);

    // Field 2: Email with error
    expect(form.fields[1].name).toBe('email');
    expect(form.fields[1].label).toBe('Email Address');
    expect(form.fields[1].placeholder).toBe('you@domain.com');
    expect(form.fields[1].errorText).toBe('Invalid email address format');

    // Field 3: Select dropdown
    expect(form.fields[2].name).toBe('role');
    expect(form.fields[2].options).toHaveLength(2);
    expect(form.fields[2].options?.[1].selected).toBe(true);
  });

  it('masks sensitive fields inside form serialization', () => {
    document.body.innerHTML = `
      <form>
        <label for="pwd">Password</label>
        <input id="pwd" name="password" type="password" value="mysecretpwd" />
      </form>
    `;

    const context = serializer.serialize();
    const field = context.forms[0].fields[0];

    expect(field.value).not.toBe('mysecretpwd');
    expect(field.value).toBe('•••••••••••');
  });

  it('formats context into concise markdown for LLM prompt', () => {
    document.title = 'Checkout';
    document.body.innerHTML = `
      <h1>Billing Details</h1>
      <form id="billing">
        <label for="fullname">Full Name</label>
        <input id="fullname" name="fullname" value="John Doe" />
      </form>
    `;

    const context = serializer.serialize();
    const formatted = serializer.formatForLLM(context);

    expect(formatted).toContain('### ACTIVE SCREEN CONTEXT');
    expect(formatted).toContain('- **Page Title**: Checkout');
    expect(formatted).toContain('# Billing Details');
    expect(formatted).toContain('[billing]');
    expect(formatted).toContain('Full Name');
    expect(formatted).toContain('value="John Doe"');
  });
});
