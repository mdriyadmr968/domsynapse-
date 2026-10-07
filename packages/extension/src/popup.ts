// DomSynapse Popup Logic

document.addEventListener('DOMContentLoaded', () => {
  const endpointInput = document.getElementById('endpoint') as HTMLInputElement;
  const enabledInput = document.getElementById('enabled') as HTMLInputElement;
  const streamInput = document.getElementById('stream') as HTMLInputElement;
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  const statusMsg = document.getElementById('status-msg') as HTMLElement;

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['domsynapse_endpoint', 'domsynapse_enabled', 'domsynapse_stream'], (items) => {
      endpointInput.value = items.domsynapse_endpoint || 'http://localhost:3000/api/domsynapse';
      enabledInput.checked = items.domsynapse_enabled !== false;
      streamInput.checked = items.domsynapse_stream !== false;
    });
  }

  saveBtn.addEventListener('click', () => {
    const endpoint = endpointInput.value.trim() || 'http://localhost:3000/api/domsynapse';
    const enabled = enabledInput.checked;
    const stream = streamInput.checked;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(
        {
          domsynapse_endpoint: endpoint,
          domsynapse_enabled: enabled,
          domsynapse_stream: stream,
        },
        () => {
          statusMsg.textContent = 'Settings saved!';
          setTimeout(() => {
            statusMsg.textContent = '';
          }, 2000);
        }
      );
    } else {
      statusMsg.textContent = 'Saved (mock mode)';
    }
  });
});
