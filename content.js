// 变量存储
let triggerBtn = null;
let popup = null;
// 使用 Map 来存储，Key 是原文，Value 是生成的 HTML
const furiganaCache = new Map();

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
  const isJapanese =
    /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(
      text
    );

  if (isJapanese) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // 显示按钮在选区上方
    showButton(
      rect.left + window.scrollX + rect.width / 2 - 15,
      rect.top + window.scrollY - 40
    );
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
  if (triggerBtn) triggerBtn.style.display = 'none';
  if (popup) popup.style.display = 'none';
}

// --- 新增：TTS 发音函数 ---
function speakJapanese(text) {
  // 取消当前正在播放的语音（防止连点重叠）
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP'; // 设置为日语
  utterance.rate = 0.9; // 语速稍慢一点，适合学习
  utterance.volume = 1; // 音量 0-1

  // 尝试寻找最佳的日语发音人（可选优化）
  const voices = window.speechSynthesis.getVoices();
  // 优先找 Google 日本语 或 Microsoft Ayumi/Haruka 等
  const jaVoice =
    voices.find((v) => v.lang === 'ja-JP' && v.name.includes('Google')) ||
    voices.find((v) => v.lang === 'ja-JP');
  if (jaVoice) utterance.voice = jaVoice;

  window.speechSynthesis.speak(utterance);
}

// --- 核心：注音生成逻辑 ---

async function showFuriganaPopup(text) {
  // 1. 定位弹窗
  const btnRect = triggerBtn.getBoundingClientRect();
  popup.style.left = `${window.scrollX + btnRect.left}px`;
  popup.style.top = `${window.scrollY + btnRect.bottom + 10}px`;
  popup.style.display = 'block';

  // 显示加载状态
  popup.innerHTML =
    '<div style="color:#999; font-size:14px;">読み込み中...</div>';

  // 2. 获取注音 HTML (调用之前的 fetchFurigana)
  const rubyHtml = await fetchFurigana(text);

  // 3. 清空弹窗，开始构建 UI
  popup.innerHTML = '';

  // --- 构建头部 (包含发音按钮) ---
  const header = document.createElement('div');
  header.className = 'furigana-header';

  const audioBtn = document.createElement('button');
  audioBtn.className = 'furigana-audio-btn';
  audioBtn.title = '朗读 (TTS)';
  // 插入一个喇叭图标 (SVG)
  audioBtn.innerHTML = `
    <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
    <span>朗読</span>
  `;

  // 绑定点击事件：朗读原本选中的纯文本 text
  audioBtn.onclick = () => speakJapanese(text);

  header.appendChild(audioBtn);
  popup.appendChild(header);

  // --- 构建内容区域 (Ruby 文本) ---
  const contentDiv = document.createElement('div');
  contentDiv.style.marginTop = '5px';
  contentDiv.innerHTML = rubyHtml; // 插入后端生成的 HTML

  popup.appendChild(contentDiv);
}

/**
 * 模拟 API 调用。
 * 在实际生产中，你需要在这里 fetch 一个后端服务（如 Yahoo Japan API 或 Kuroshiro）。
 */
// content.js

async function fetchFurigana(text) {
  if (furiganaCache.has(text)) {
    console.log('命中缓存，跳过网络请求:', text);
    return furiganaCache.get(text);
  }
  // 指向你的 Python 本地服务器
  const API_URL = 'http://127.0.0.1:8000/furigana';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // 请求成功后，将结果存入 Map
    furiganaCache.set(text, data.html);
    console.log('data', data.html);
    return data.html; // 直接返回后端生成的 HTML
  } catch (error) {
    console.error('API 请求失败:', error);
    return `<span style="color:red; font-size:12px;">连接本地服务器失败<br>请确认 python main.py 已运行</span>`;
  }
}

async function fetchFurigana1(text, hls = []) {
  // 如果缓存里已经有这句话，直接返回，不再发起网络请求
  if (furiganaCache.has(text)) {
    console.log('命中缓存，跳过网络请求:', text);
    return furiganaCache.get(text);
  }
  // 1. 修改为新的 analyze 接口地址
  const API_URL = 'http://127.0.0.1:8000/analyze';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('data:', data);
    // 2. 前端拼接 HTML 逻辑
    // data.results 是一个数组，包含分词后的对象
    let htmlOutput = '';

    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((token) => {
        // 判断是否有 kanji_base 和 furigana，如果有则渲染 ruby
        let html = '';
        if (token.kanji_base && token.furigana) {
          // 结构: <ruby>汉字部分<rt>读音</rt></ruby>送假名
          html += `<ruby>${token.kanji_base}<rt>${token.furigana}</rt></ruby>${token.okurigana}`;
        } else {
          // 没有汉字，直接显示原文 (surface)
          html += token.surface;
        }
        if (hls.includes(token.surface)) {
          html = `<span style="color:#ff264e;">${html}</span>`;
        }
        htmlOutput += html;
      });
    } else {
      return '数据解析错误';
    }

    // 请求成功后，将结果存入 Map
    furiganaCache.set(text, htmlOutput);

    return htmlOutput;
  } catch (error) {
    console.error('API 请求失败:', error);
    return `<span style="color:red; font-size:12px;">无法连接后端<br>请检查 python 服务</span>`;
  }
}

// 启动
initElements();
