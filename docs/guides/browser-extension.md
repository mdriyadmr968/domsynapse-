# DomSynapse Browser Extension Guide 🧩

The DomSynapse Chrome Extension brings context-aware AI form assistance, spotlights, and intelligent autofill to **any website on the internet** without needing access to the host codebase.

---

## 1. Building the Extension

Ensure all packages in the monorepo are installed and built:

```bash
# From repository root
pnpm install
pnpm build
pnpm --filter @domsynapse/extension run build
```

This compiles `content.js`, `background.js`, `popup.js`, `content.css`, and copies `manifest.json` into `packages/extension/dist`.

---

## 2. Installing in Google Chrome / Brave

1. Open your browser and navigate to:
   ```text
   chrome://extensions/
   ```
2. Enable **Developer mode** in the top-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Select the build directory:
   ```text
   <path-to-repository>/packages/extension/dist
   ```
5. You should now see **DomSynapse AI Web Copilot** in your extensions list.

---

## 3. Installing in Microsoft Edge

1. Navigate to:
   ```text
   edge://extensions/
   ```
2. Turn on **Developer mode** in the left-hand navigation menu.
3. Click **Load unpacked** and select `packages/extension/dist`.

---

## 4. Configuring Extension Settings

Click the **DomSynapse** icon in your browser toolbar to open the settings popup:

- **AI Backend Endpoint**: The URL where requests will be sent (default: `http://localhost:3000/api/domsynapse` or `http://localhost:3000/api/copilot`).
- **Enable copilot on webpages**: Master toggle to activate/deactivate the copilot launcher on web pages.
- **Enable SSE token streaming**: Toggles real-time streaming tokens.
- Click **Save Settings**.

---

## 5. Using on Any Webpage

1. Navigate to any website with forms (e.g., signup pages, checkout forms, survey forms, internal portals).
2. Look for the floating circular **DomSynapse** launcher badge in the bottom-right corner.
3. Click the badge to expand the copilot interface.
4. Enter any instruction, or click quick prompt chips:
   - **⚡ Fill Form**: Automatically predicts and fills empty inputs.
   - **🎯 Spotlight**: Highlights target elements and guides your focus.
   - **📋 Summarize**: Summarizes the inputs present on the page.
5. Review the in-page diff preview card before applying changes.
6. Use the **Undo (↶)** and **Redo (↷)** buttons to safely revert form mutations at any time.
