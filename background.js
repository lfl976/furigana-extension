chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // 这个代码最终会在网页里执行
      const list = document.querySelectorAll(
        '.text_info > span:first-child:not(.pill-label)'
      );
      list.forEach(async (item) => {
        const hls = Array.from(
          item.querySelectorAll('span[style*="color:#ff264e"]')
        ).map((el) => el.textContent.trim());
        item.innerHTML = await fetchFurigana1(item.textContent, [
          ...new Set(hls),
        ]);
      });
    },
  });
});
