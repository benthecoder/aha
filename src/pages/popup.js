document.addEventListener('DOMContentLoaded', () => {
  const toggleLinks = document.getElementById('toggleLinks');
  const historicalCalls = document.getElementById('historicalCalls');

  // Load the current setting from storage
  chrome.storage.local.get('getLinks', (result) => {
    toggleLinks.checked = result.getLinks !== false;
  });

  // Save the setting when the checkbox is toggled
  toggleLinks.addEventListener('change', () => {
    chrome.storage.local.set({ getLinks: toggleLinks.checked });
  });

  chrome.storage.local.get('savedExplanations', (result) => {
    const savedExplanations = result.savedExplanations || {};
    console.log('Saved explanations:', savedExplanations); // Log stored data

    for (const [term, explanation] of Object.entries(savedExplanations)) {
      const item = document.createElement('button');
      item.className = 'historical-item';
      item.textContent = term;
      item.addEventListener('click', () => showExplanation(term, explanation));
      historicalCalls.appendChild(item);
    }
  });
});

function showExplanation(term, explanationData) {
  console.log('Showing explanation for:', term);
  const popup = document.createElement('div');
  popup.className = 'explanation-popup';

  const header = document.createElement('div');
  header.className = 'explanation-header';
  header.textContent = term;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.className = 'close-btn';
  closeBtn.addEventListener('click', () => {
    console.log('Closing popup');
    popup.remove();
  });

  const content = document.createElement('div');
  content.className = 'explanation-content';

  // Combine explanation and related links
  let combinedContent = explanationData.explanation || '';
  if (explanationData.relatedLinks) {
    combinedContent +=
      '\n\n' + decodeURIComponent(explanationData.relatedLinks);
  }

  // Parse the markdown content
  const parsedContent = marked.parse(combinedContent);
  content.innerHTML = parsedContent;

  // Add event listener for links
  content.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      chrome.tabs.create({ url: e.target.href });
    }
  });

  popup.appendChild(header);
  popup.appendChild(closeBtn);
  popup.appendChild(content);

  document.body.appendChild(popup);
  console.log('Popup appended to body');
}
