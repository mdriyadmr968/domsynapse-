/**
 * DomSynapse Extension Background Service Worker
 */

chrome.runtime.onInstalled.addListener(() => {
  // Set default storage configurations
  chrome.storage.sync.get(['domsynapse_endpoint', 'domsynapse_enabled'], (items) => {
    if (!items.domsynapse_endpoint) {
      chrome.storage.sync.set({
        domsynapse_endpoint: 'http://localhost:3000/api/domsynapse',
        domsynapse_enabled: true,
        domsynapse_stream: true,
      });
    }
  });
  console.log('[DomSynapse Extension] Installed successfully.');
});

// Relay messages between popup and active tab if needed
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_EXTENSION_STATUS') {
    sendResponse({ active: true, version: '0.1.0' });
  }
  return true;
});
