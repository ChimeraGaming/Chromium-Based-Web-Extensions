const scrapedTitles = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "scrapeTab") {
    chrome.tabs.create({ url: msg.url, active: false }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);

          chrome.scripting.executeScript(
            {
              target: { tabId },
              func: () => ({
                title: document.querySelector("#productTitle")?.textContent.trim() || document.title,
                url: location.href
              })
            },
            (results) => {
              const { title, url } = results?.[0]?.result || {};
              chrome.tabs.remove(tabId);

              if (title && url) {
                scrapedTitles.push({ title, url });

                // Send to content script
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                  if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                      action: "addScrapedItem",
                      item: { title, url }
                    });
                  }
                });
              }
            }
          );
        }
      });
    });
  }
});
