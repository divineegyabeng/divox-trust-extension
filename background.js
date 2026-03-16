chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'divox-scan',
    title: 'Scan with DivoX Trust',
    contexts: ['link', 'selection', 'page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const data = info.linkUrl || info.selectionText || tab.url;
  const type = info.linkUrl ? 'url' : info.selectionText ? 'message' : 'url';
  chrome.storage.local.set({ pendingScan: { data, type } });
  chrome.action.openPopup();
});
