document.getElementById("highlightBtn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Tab found:", tab);
    if (!tab || !tab.id) {
        console.error("No active tab found.");
        return;
    }
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  });
