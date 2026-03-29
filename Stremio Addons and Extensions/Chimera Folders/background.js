/*
╔════════════════════════════════════════════════════════════╗
║ SETTINGS TAB MESSAGE ROUTER                               ║
╚════════════════════════════════════════════════════════════╝
*/

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'chimera-open-settings') {
        return undefined;
    }

    chrome.runtime.openOptionsPage(() => {
        if (chrome.runtime.lastError) {
            sendResponse({
                ok: false,
                error: chrome.runtime.lastError.message
            });
            return;
        }

        sendResponse({ ok: true });
    });

    return true;
});
