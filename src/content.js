// Constants
const POPUP_ID = 'aha-explanation-popup';
const SAVE_BUTTON_DELAY = 2000;

// Main entry point
console.log('Content script loaded');
chrome.runtime.onMessage.addListener(handleMessage);

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

function handleGetSelectedText() {
  const selectedText = window.getSelection().toString();
  const pageTitle = document.title;
  console.log('Selected text:', selectedText);
  console.log('Page title:', pageTitle);

  if (selectedText) {
    console.log('Sending explainText message to background');
    chrome.runtime.sendMessage({
      action: 'explainText',
      text: selectedText,
      pageTitle: pageTitle,
    });
  } else {
    console.log('No text selected');
  }
}

function handleShowExplanation(request) {
  console.log('Showing explanation:', request.explanation);
  showExplanation(
    {
      explanation: request.explanation,
      relatedLinks: request.relatedLinks,
    },
    request.selectedText
  );
}

// Popup creation and management
function createPopup(selectedText, getLinks) {
  const host = document.createElement('div');
  host.id = POPUP_ID;

  const shadow = host.attachShadow({ mode: 'open' });

  const popup = document.createElement('div');
  popup.className = 'aha-popup';
  popup.innerHTML = `
      <div class="aha-explanation-content">
        <div class="aha-explanation-header">
          <span class="aha-explanation-title">${selectedText}</span>
          <button id="aha-close-btn" class="aha-close-btn">&times;</button>
        </div>
        <div id="aha-explanation-text" class="aha-scrollable">
          <div class="aha-loading">
            <div class="aha-loading-spinner"></div>
          </div>
        </div>
        <div class="aha-footer">
          <button id="aha-copy-btn" class="aha-copy-btn">📋</button>
          ${
            getLinks
              ? '<button id="aha-open-all-links" class="aha-open-all-links">🔗</button>'
              : ''
          }
        </div>
      </div>
    `;

  shadow.appendChild(popup);
  loadExternalCSS(shadow);

  return host;
}

function showLoader(selectedText) {
  const existingPopup = document.getElementById(POPUP_ID);
  if (existingPopup) {
    existingPopup.remove();
  }

  const popupHost = createPopup(selectedText, true);
  document.body.appendChild(popupHost);

  const shadow = popupHost.shadowRoot;
  positionPopup(shadow.querySelector('.aha-popup'));
}

function showExplanation(explanationData, selectedText) {
  console.log('Received explanationData:', explanationData);
  console.log('Received selectedText:', selectedText);

  const existingPopup = document.getElementById(POPUP_ID);
  if (existingPopup) {
    existingPopup.remove();
    console.log('Existing explanation popup removed');
  }

  chrome.storage.local.get('getLinks', (result) => {
    const getLinks = result.getLinks !== false;
    const popupHost = createPopup(selectedText, getLinks);
    document.body.appendChild(popupHost);

    const shadow = popupHost.shadowRoot;
    const popup = shadow.querySelector('.aha-popup');
    positionPopup(popup);

    // Add scroll event listener
    window.addEventListener('scroll', () => {
      positionPopup(popup);
    });

    // Add resize event listener
    window.addEventListener('resize', () => {
      positionPopup(popup);
    });

    setupPopupButtons(shadow, selectedText, explanationData);
    populateExplanationContent(shadow, explanationData, getLinks);

    saveExplanation(selectedText, explanationData);
    makeDraggable(popupHost);
  });
}

function positionPopup(popup) {
  const viewportWidth = window.innerWidth;

  // Set a fixed distance from the top and right edges
  const topMargin = 20;
  const rightMargin = 20;

  // Calculate the position
  const left = viewportWidth - popup.offsetWidth - rightMargin;

  // Set the position
  popup.style.position = 'fixed';
  popup.style.left = `${left}px`;
  popup.style.top = `${topMargin}px`;
}

// Popup content and functionality
function setupPopupButtons(shadow, selectedText, explanationData) {
  const saveBtn = shadow.getElementById('aha-save-btn');
  if (saveBtn) {
    setupSaveButton(saveBtn, selectedText, explanationData);
  }

  const closeBtn = shadow.getElementById('aha-close-btn');
  if (closeBtn) {
    setupCloseButton(closeBtn, shadow.host);
  }

  const copyBtn = shadow.getElementById('aha-copy-btn');
  if (copyBtn) {
    setupCopyButton(copyBtn, selectedText, explanationData);
  }
}

function populateExplanationContent(shadow, explanationData, getLinks) {
  const explanationText = shadow.getElementById('aha-explanation-text');
  if (explanationText) {
    const combinedContent = processExplanationContent(
      explanationData,
      getLinks
    );
    const parsedContent = marked.parse(combinedContent);

    explanationText.innerHTML = parsedContent;

    const links = explanationText.getElementsByTagName('a');
    setupLinks(links);

    setupOpenAllLinksButton(shadow, getLinks, links);

    if (explanationText.textContent.trim() === '') {
      shadow.host.remove();
      console.log('No content to display, popup removed');
    }
  } else {
    console.error('Could not find explanation text element');
  }
}

// Utility functions
function processExplanationContent(explanationData, getLinks) {
  if (typeof explanationData === 'object' && explanationData !== null) {
    let content = explanationData.explanation || 'No explanation available.';
    if (getLinks && explanationData.relatedLinks) {
      content += '\n\n' + decodeURIComponent(explanationData.relatedLinks);
    }
    return content;
  } else if (typeof explanationData === 'string') {
    return decodeURIComponent(explanationData);
  }
  return 'Error: Invalid explanation data received.';
}

function setupLinks(links) {
  for (let link of links) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
}

function setupOpenAllLinksButton(shadow, getLinks, links) {
  const footer = shadow.querySelector('.aha-footer');
  if (getLinks && links.length > 0) {
    const openAllLinksBtn = shadow.getElementById('aha-open-all-links');
    if (openAllLinksBtn) {
      openAllLinksBtn.addEventListener('click', () => {
        const urls = Array.from(links).map((link) => link.href);
        chrome.runtime.sendMessage({
          action: 'openAllLinks',
          urls: urls,
        });
      });
    }
  } else if (footer) {
    const openAllLinksBtn = footer.querySelector('.aha-open-all-links');
    if (openAllLinksBtn) {
      openAllLinksBtn.remove();
    }
  }
}

function setupCopyButton(copyBtn, selectedText, explanationData) {
  copyBtn.addEventListener('click', () => {
    const markdownContent = generateMarkdownContent(
      selectedText,
      explanationData
    );
    copyToClipboard(markdownContent);
    copyBtn.textContent = '✅';
    setTimeout(() => {
      copyBtn.textContent = '📋';
    }, SAVE_BUTTON_DELAY);
  });
}

function generateMarkdownContent(selectedText, explanationData) {
  let content = `# ${selectedText}\n\n`;
  content += explanationData.explanation || 'No explanation available.';
  if (explanationData.relatedLinks) {
    content += decodeURIComponent(explanationData.relatedLinks);
  }
  return content;
}

function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  navigator.clipboard.writeText(textarea.value).then(() => {
    document.body.removeChild(textarea);
  });
}

function setupCloseButton(closeBtn, popupHost) {
  closeBtn.addEventListener('click', () => {
    popupHost.remove();
    console.log('Explanation popup removed');
  });
}

function makeDraggable(element) {
  const shadow = element.shadowRoot;
  const popup = shadow.querySelector('.aha-popup');
  const header = shadow.querySelector('.aha-explanation-header');
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  header.style.cursor = 'move';

  header.addEventListener('mousedown', startDragging);

  function startDragging(e) {
    e.preventDefault(); // Prevent text selection
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(popup.style.left) || 0;
    startTop = parseInt(popup.style.top) || 0;

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDragging);
  }

  function drag(e) {
    if (isDragging) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      popup.style.left = `${startLeft + deltaX}px`;
      popup.style.top = `${startTop + deltaY}px`;
    }
  }

  function stopDragging() {
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDragging);
  }
}

function saveExplanation(term, explanationData) {
  console.log('Attempting to save explanation for:', term);
  chrome.storage.local.get('savedExplanations', (result) => {
    const savedExplanations = result.savedExplanations || {};
    savedExplanations[term] = explanationData;
    chrome.storage.local.set({ savedExplanations: savedExplanations }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving explanation:', chrome.runtime.lastError);
      } else {
        console.log('Explanation saved successfully for:', term);
        console.log('Updated savedExplanations:', savedExplanations);
      }
    });
  });
}

// CSS styles
function loadExternalCSS(shadow) {
  const style = document.createElement('style');
  style.textContent = `
    .aha-popup {
      position: absolute;
      width: 300px;
      max-height: 80vh;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: #000000; /* Ensure text color is always black */
    }

    .aha-explanation-content {
      padding: 8px;
      display: flex;
      flex-direction: column;
      height: 100%;
      color: #000000; /* Ensure text color is always black */
    }

    .aha-explanation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    }

    .aha-explanation-title {
      font-size: 14px;
      font-weight: 600;
      color: #333333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .aha-close-btn {
      background: none;
      border: none;
      font-size: 18px;
      color: #999999;
      cursor: pointer;
      padding: 0;
    }

    .aha-scrollable {
      flex-grow: 1;
      overflow-y: auto;
      margin-bottom: 8px;
      font-size: 13px;
      line-height: 1.4;
      max-height: calc(80vh - 80px);
      color: #000000; /* Ensure text color is always black */
    }

    .aha-footer {
      display: flex;
      justify-content: space-between;
    }

    .aha-save-btn, .aha-open-all-links {
      background: none;
      border: none;
      font-size: 14px;
      cursor: pointer;
      padding: 4px;
      color: #000000; /* Ensure text color is always black */
    }

    #aha-explanation-text * {
      max-width: 100%;
      color: #000000; /* Ensure text color is always black */
    }

    #aha-explanation-text ul, #aha-explanation-text ol {
      padding-left: 20px;
    }

    #aha-explanation-text {
      word-wrap: break-word;
      overflow-wrap: break-word;
      color: #000000; /* Ensure text color is always black */
    }

    #aha-explanation-text a {
      color: #0066cc;
      text-decoration: none;
      word-break: break-word;
    }

    #aha-explanation-text a:hover {
      text-decoration: underline;
    }

    .aha-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100px;
    }

    .aha-loading-spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  shadow.appendChild(style);
}
