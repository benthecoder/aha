import { fetchCerebrasExplanation } from './cerebras.js';
import { fetchExaLinks } from './exa.js';

console.log('Background script loaded');

chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  if (command === 'explainText') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log('Sending getSelectedText message to tab:', tabs[0].id);
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelectedText' });
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background:', request);
  if (request.action === 'explainText') {
    console.log(
      'Calling explainText with:',
      request.text,
      'and page title:',
      request.pageTitle
    );
    explainText(sender.tab.id, request.text, request.pageTitle);
  } else if (request.action === 'openAllLinks') {
    console.log('Received openAllLinks request:', request);
    openAllLinks(request.urls);
  }
  return true;
});

async function openAllLinks(urls) {
  // Save the current tab ID for later use
  const [currentTab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });

  // Open new tabs for each URL
  for (const url of urls) {
    console.log('Opening URL:', url);
    await chrome.tabs.create({ url, active: false });
  }

  // Switch back to the original tab
  await chrome.tabs.update(currentTab.id, { active: true });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ getLinks: true });
});

async function explainText(tabId, text, pageTitle) {
  if (!text.trim()) return;

  const words = text.trim().split(/\s+/);
  if (words.length > 5) {
    console.log('Text is too long, skipping API request');
    return sendExplanationMessage(tabId, {
      explanation: 'Please select up to 5 words only.',
      selectedText: text,
    });
  }

  chrome.tabs.sendMessage(tabId, {
    action: 'showLoader',
    selectedText: text,
  });

  try {
    const explanationResponse = await fetchCerebrasExplanation(text, pageTitle);
    const { getLinks } = await chrome.storage.local.get('getLinks');

    let combinedResponse = {
      explanation: explanationResponse,
      relatedLinks: '',
    };

    // Only fetch EXA links if getLinks is true
    if (getLinks) {
      const exaResponse = await fetchExaLinks(text, pageTitle);
      combinedResponse.relatedLinks = exaResponse;
    }

    console.log(
      'Sending combined response to content script:',
      combinedResponse
    );
    chrome.tabs.sendMessage(tabId, {
      action: 'showExplanation',
      ...combinedResponse,
      selectedText: text,
    });
  } catch (error) {
    console.error('Error in explainText:', error);
    chrome.tabs.sendMessage(tabId, {
      action: 'showExplanation',
      explanation:
        "Sorry, couldn't get an explanation or related links. Error: " +
        error.message,
      selectedText: text,
    });
  }
}
