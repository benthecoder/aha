# how it works

how `background.js` and `content.js` work together. Let's break it down:

1. Background Script (`background.js`):

   - Runs continuously in the background
   - Listens for commands and messages
   - Communicates with external APIs (Cerebras and Exa)
   - Manages tab operations

2. Content Script (`content.js`):
   - Injected into web pages
   - Interacts with the webpage's DOM
   - Creates and manages the explanation popup
   - Handles user interactions within the popup

Now, let's look at the key listeners and their roles:

3. `chrome.commands.onCommand.addListener`:

```6:14:src/background.js
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  if (command === 'explainText') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log('Sending getSelectedText message to tab:', tabs[0].id);
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelectedText' });
    });
  }
});
```

- Listens for the keyboard shortcut (Ctrl+Shift+X or Cmd+Shift+X)
- When triggered, it sends a message to the active tab to get selected text

4. `chrome.runtime.onMessage.addListener` (in background.js):

```16:26:src/background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background:', request);
  if (request.action === 'explainText') {
    console.log('Calling explainText with:', request.text);
    explainText(sender.tab.id, request.text);
  } else if (request.action === 'openAllLinks') {
    console.log('Received openAllLinks request:', request);
    openAllLinks(request.urls);
  }
  return true;
});
```

- Listens for messages from content scripts
- Handles 'explainText' and 'openAllLinks' actions

5. `chrome.runtime.onMessage.addListener` (in content.js):

```9:27:src/content.js
// Message handling
function handleMessage(request, sender, sendResponse) {
  console.log('Message received in content script:', request);

  switch (request.action) {
    case 'getSelectedText':
      handleGetSelectedText();
      break;
    case 'showLoader':
      showLoader(request.selectedText);
      break;
    case 'showExplanation':
      handleShowExplanation(request);
      break;
  }

  return true;
}

```

- Listens for messages from the background script
- Handles 'getSelectedText', 'showLoader', and 'showExplanation' actions

Now, let's walk through the entire flow:

1. User selects text on a webpage and presses the keyboard shortcut.
2. Background script receives the command and sends a 'getSelectedText' message to the active tab.
3. Content script receives the message, gets the selected text, and sends it back to the background script with an 'explainText' action.
4. Background script receives the 'explainText' message and:
   a. Sends a 'showLoader' message to the content script.
   b. Calls the Cerebras API for an explanation.
   c. If enabled, calls the Exa API for related links.
   d. Combines the responses and sends a 'showExplanation' message to the content script.
5. Content script receives the 'showExplanation' message and:
   a. Creates or updates the explanation popup with the received data.
   b. Sets up event listeners for user interactions (copy, close, open links).
6. If the user clicks the "Open All Links" button, the content script sends an 'openAllLinks' message to the background script.
7. The background script receives the 'openAllLinks' message and opens the URLs in new tabs.

## commands

Here's a summary of the main commands used in the extension, along with a brief description of their purpose:

- `chrome.commands.onCommand.addListener`:
  • Listens for the keyboard shortcut to trigger the text explanation feature.

- `chrome.runtime.onMessage.addListener` (in background.js):
  • Handles messages from content scripts, including requests for explanations and opening links.

- `chrome.runtime.onMessage.addListener` (in content.js):
  • Processes messages from the background script to manage the popup and user interactions.

- `chrome.tabs.sendMessage`:
  • Sends messages from the background script to specific tabs, initiating actions in the content script.

- `chrome.runtime.sendMessage`:
  • Sends messages from the content script to the background script, typically to request explanations or open links.

- `chrome.storage.local.get` and `chrome.storage.local.set`:
  • Manages local storage for saving user preferences and explanation history.

- `chrome.tabs.query`:
  • Finds the active tab to send messages or perform actions on the current page.

- `chrome.tabs.create`:
  • Opens new tabs when the user requests to open all related links.

- `chrome.tabs.update`:
  • Switches back to the original tab after opening related links in new tabs.

These commands work together to create a seamless flow of communication between different parts of the extension and the browser, enabling the core functionality of text explanation and link management.
