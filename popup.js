// popup.js

// ==========================================
// 逻辑 1: Popup 输入框注音
// ==========================================
document.getElementById('convert-btn').addEventListener('click', async () => {
  const text = document.getElementById('input-text').value;
  const resultDiv = document.getElementById('result-area');

  if (!text) {
    resultDiv.innerHTML = '请输入日文';
    return;
  }

  resultDiv.innerHTML = '正在注音...';

  try {
    // 调用返回成品 HTML 的接口
    const response = await fetch('http://127.0.0.1:8000/furigana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text }),
    });

    const data = await response.json();

    // 接口返回结构: { "html": "<ruby>...</ruby>..." }
    if (data.html) {
      resultDiv.innerHTML = data.html;
    } else {
      resultDiv.innerHTML = '未获取到注音结果';
    }
  } catch (e) {
    console.error(e);
    resultDiv.innerHTML = `<span style="color:red">连接失败: 请检查后端服务是否启动</span>`;
  }
});

// ==========================================
// 逻辑 2: 原有的一键替换功能
// ==========================================
document.getElementById('batch-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const statusDiv = document.getElementById('status-msg');

  statusDiv.textContent = '正在处理页面...';

  // 执行脚本注入
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: injectedPageScript, // 指定要在页面里跑的函数
    },
    () => {
      statusDiv.textContent = '处理完成！';
    }
  );
});

/**
 * 这个函数会被注入到网页中执行。
 * 注意：它不能访问 popup.js 外部的变量，所以所有依赖（包括API地址、fetch函数）都要写在里面。
 */
async function injectedPageScript() {
  const API_URL = 'http://127.0.0.1:8000/analyze';

  // 在注入脚本内部定义 fetch 函数
  async function fetchFuriganaInPage(text, highlights) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
      });
      const data = await response.json();
      if (!data.results) return text;

      let htmlOutput = '';
      data.results.forEach((token) => {
        let part = '';
        if (token.kanji_base && token.furigana) {
          part = `<ruby>${token.kanji_base}<rt>${token.furigana}</rt></ruby>${token.okurigana}`;
        } else {
          part = token.surface;
        }
        if (highlights.includes(token.surface)) {
          part = `<span style="color:#ff264e;">${part}</span>`;
        }
        htmlOutput += part;
      });
      return htmlOutput;
    } catch (e) {
      console.error(e);
      return text; // 失败返回原文
    }
  }

  // --- 原有的业务逻辑 ---
  const list = document.querySelectorAll(
    '.text_info > span:first-child:not(.pill-label)'
  );

  // 使用 for...of 循环配合 await，或者 Promise.all
  for (const item of list) {
    // 提取高亮词逻辑
    const hls = Array.from(
      item.querySelectorAll('span[style*="color:#ff264e"]')
    ).map((el) => el.textContent.trim());

    // 调用上面定义的内部函数
    const newHtml = await fetchFuriganaInPage(item.textContent, [
      ...new Set(hls),
    ]);
    item.innerHTML = newHtml;
  }
}
