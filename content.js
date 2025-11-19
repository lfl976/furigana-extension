// 变量存储
let triggerBtn = null;
let popup = null;

// 初始化：创建DOM元素但不显示
function initElements() {
  triggerBtn = document.createElement('button');
  triggerBtn.id = 'furigana-trigger-btn';
  triggerBtn.innerHTML = '文'; // 按钮图标
  triggerBtn.style.display = 'none';
  document.body.appendChild(triggerBtn);

  popup = document.createElement('div');
  popup.id = 'furigana-popup';
  popup.style.display = 'none';
  document.body.appendChild(popup);

  // 按钮点击事件
  triggerBtn.addEventListener('mousedown', (e) => {
    e.preventDefault(); // 防止点击按钮导致选区消失
    e.stopPropagation();
    const text = window.getSelection().toString();
    if (text) {
      showFuriganaPopup(text);
    }
  });

  // 点击页面其他地方隐藏弹窗
  document.addEventListener('mousedown', (e) => {
    if (e.target !== triggerBtn && !popup.contains(e.target)) {
      hideUI();
    }
  });
}

// 监听鼠标抬起事件（选中文本）
document.addEventListener('mouseup', (e) => {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  // 如果没有文本，或者点击的是我们自己的插件UI，则忽略
  if (!text || e.target === triggerBtn || popup.contains(e.target)) {
    return;
  }

  // 简单判断是否包含日语字符 (平假名/片假名/汉字)
  const isJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text);
  
  if (isJapanese) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // 显示按钮在选区上方
    showButton(rect.left + window.scrollX + (rect.width / 2) - 15, rect.top + window.scrollY - 40);
  } else {
    hideUI();
  }
});

function showButton(x, y) {
  triggerBtn.style.left = `${x}px`;
  triggerBtn.style.top = `${y}px`;
  triggerBtn.style.display = 'flex';
  popup.style.display = 'none'; // 显示按钮时先隐藏旧弹窗
}

function hideUI() {
  if(triggerBtn) triggerBtn.style.display = 'none';
  if(popup) popup.style.display = 'none';
}

// --- 核心：注音生成逻辑 ---

async function showFuriganaPopup(text) {
  // 1. 定位弹窗到按钮附近
  const btnRect = triggerBtn.getBoundingClientRect();
  popup.style.left = `${window.scrollX + btnRect.left}px`;
  popup.style.top = `${window.scrollY + btnRect.bottom + 10}px`;
  popup.style.display = 'block';
  
  popup.innerHTML = "正在注音...";

  // 2. 获取注音 HTML
  const rubyHtml = await fetchFurigana(text);
  
  popup.innerHTML = rubyHtml;
}

/**
 * 模拟 API 调用。
 * 在实际生产中，你需要在这里 fetch 一个后端服务（如 Yahoo Japan API 或 Kuroshiro）。
 */
// content.js

async function fetchFurigana(text) {
  // 1. 修改为新的 analyze 接口地址
  const API_URL = "http://127.0.0.1:8000/analyze"; 
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("data:", data)
    // 2. 前端拼接 HTML 逻辑
    // data.results 是一个数组，包含分词后的对象
    let htmlOutput = "";
    
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach(token => {
        // 判断是否有 kanji_base 和 furigana，如果有则渲染 ruby
        if (token.kanji_base && token.furigana) {
          // 结构: <ruby>汉字部分<rt>读音</rt></ruby>送假名
          htmlOutput += `<ruby>${token.kanji_base}<rt>${token.furigana}</rt></ruby>${token.okurigana}`;
        } else {
          // 没有汉字，直接显示原文 (surface)
          htmlOutput += token.surface;
        }
      });
    } else {
      return "数据解析错误";
    }

    return htmlOutput;

  } catch (error) {
    console.error("API 请求失败:", error);
    return `<span style="color:red; font-size:12px;">无法连接后端<br>请检查 python 服务</span>`;
  }
}

// 启动
initElements();