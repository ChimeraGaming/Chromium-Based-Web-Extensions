chrome.action.onClicked.addListener(function (tab) {
  if (!tab.id) return;
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["overlay.js"]
  });
});