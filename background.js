// Background script for VU Education Lab AI Assistant
// Handles communication between content script and popup

// Check authentication status on extension install or update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  // Check if user is authenticated
  const result = await chrome.storage.local.get(['vuAuthUser']);
  if (!result.vuAuthUser) {
    console.log('User not authenticated - will require login');
  } else {
    console.log('User authenticated:', result.vuAuthUser.email);
  }
});

// Check authentication status on browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Browser started - checking authentication');
  
  const result = await chrome.storage.local.get(['vuAuthUser']);
  if (!result.vuAuthUser) {
    console.log('User not authenticated - will require login');
  } else {
    console.log('User authenticated:', result.vuAuthUser.email);
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "analyzeContent":
      chrome.runtime.sendMessage({
        action: "processAPIRequest",
        content: request.content,
        prompt: request.prompt
      });
      break;
    case "getPageContent":
      chrome.scripting.executeScript({
        target: { tabId: request.tabId },
        function: getPageContent
      }).then(results => {
        sendResponse({ content: results[0].result });
      });
      return true; // Required for async sendResponse
    case "checkAuth":
      // Check authentication status
      chrome.storage.local.get(['vuAuthUser'], (result) => {
        sendResponse({ 
          authenticated: !!result.vuAuthUser,
          user: result.vuAuthUser || null
        });
      });
      return true; // Required for async sendResponse
    default:
      break;
  }
});

// Function to extract page content
function getPageContent() {
  return {
    title: document.title,
    url: window.location.href,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
    headings: Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.innerText)
      .join('\n'),
    bodyText: document.body.innerText
  };
}
