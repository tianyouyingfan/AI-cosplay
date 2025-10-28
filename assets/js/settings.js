/**
 * @file settings.js
 * @description 设置页面的所有交互逻辑。
 */

import { getSettings, saveSettings } from './services/storage.service.js';
import { verifyApiKey } from './services/api.service.js';
import { processImage } from './utils/image.util.js';
import { showToast } from './utils/dom.util.js';

// --- 1. DOM 元素选择 ---
// 将页面上需要交互的元素提前获取并存储起来
const apiKeyInput = document.getElementById('apiKeyInput');
const addApiKeyBtn = document.getElementById('addApiKeyBtn');
const apiKeyListContainer = document.getElementById('apiKeyListContainer');
const verifyAllKeysBtn = document.getElementById('verifyAllKeysBtn');

const temperatureSlider = document.getElementById('temperatureSlider');
const temperatureValueSpan = document.getElementById('temperatureValue');
const promptTextarea = document.getElementById('promptTextarea');

const modelImageUploadContainer = document.getElementById('modelImageUploadContainer');
const modelImagePreview = document.getElementById('modelImagePreview');
const backBtn = document.getElementById('backBtn');
// 创建一个隐藏的文件输入框，通过点击图片区域来触发它
const modelImageFileInput = document.createElement('input');
modelImageFileInput.type = 'file';
modelImageFileInput.accept = 'image/*';
modelImageFileInput.style.display = 'none';


// --- 2. 渲染函数 ---
// 这些函数负责将数据更新到 UI 上

/**
 * 根据 apiKeys 数组渲染 API Key 列表。
 */
function renderApiKeys() {
  const { apiKeys } = getSettings();
  apiKeyListContainer.innerHTML = ''; // 清空现有列表

  if (apiKeys.length === 0) {
    apiKeyListContainer.innerHTML = '<p class="text-slate-500 text-sm text-center py-2">尚未添加任何 API Key。</p>';
    return;
  }

  apiKeys.forEach((keyObj, index) => {
    const keyItem = document.createElement('div');
    keyItem.className = 'flex items-center gap-4 bg-transparent px-0 min-h-14 justify-between';

    let statusIconHtml = '';
    switch (keyObj.status) {
      case 'valid':
        statusIconHtml = `<div class="text-green-600 flex items-center justify-center rounded-lg bg-green-500/20 shrink-0 size-10"><span class="material-symbols-outlined text-2xl">check_circle</span></div>`;
        break;
      case 'invalid':
        statusIconHtml = `<div class="text-red-600 flex items-center justify-center rounded-lg bg-red-500/20 shrink-0 size-10"><span class="material-symbols-outlined text-2xl">cancel</span></div>`;
        break;
      default: // 'unknown' or undefined
        statusIconHtml = `<div class="text-slate-500 flex items-center justify-center rounded-lg bg-slate-500/20 shrink-0 size-10"><span class="material-symbols-outlined text-2xl">help_outline</span></div>`;
    }

    keyItem.innerHTML = `
      <div class="flex items-center gap-4">
        ${statusIconHtml}
        <p class="text-slate-900 text-base font-normal leading-normal flex-1 truncate">
          API-Key-${index + 1}: ${keyObj.key.substring(0, 5)}...${keyObj.key.substring(keyObj.key.length - 5)}
        </p>
      </div>
      <div class="shrink-0 flex items-center gap-1">
        <button data-key="${keyObj.key}" class="delete-key-btn text-slate-500 hover:text-red-500 flex size-7 items-center justify-center transition-colors">
          <span class="material-symbols-outlined !text-xl">delete</span>
        </button>
      </div>
    `;
    apiKeyListContainer.appendChild(keyItem);
  });
}

/**
 * 渲染 AI 模型参数。
 */
function renderAiParams() {
  const { aiParams } = getSettings();
  temperatureSlider.value = aiParams.temperature;
  temperatureValueSpan.textContent = aiParams.temperature.toFixed(1);
  promptTextarea.value = aiParams.prompt;
}

/**
 * 渲染用户上传的全身照。
 */
function renderModelImage() {
  const { modelImage } = getSettings();
  if (modelImage) {
    modelImagePreview.src = modelImage;
    modelImagePreview.classList.remove('hidden'); // 显示图片
  } else {
    modelImagePreview.classList.add('hidden'); // 隐藏图片
  }
}


// --- 3. 事件处理函数 ---
// 这些函数处理用户的具体操作

function handleAddApiKey() {
  const newKey = apiKeyInput.value.trim();
  if (!newKey.startsWith('sk-')) {
    showToast('请输入有效的 API Key (以 sk- 开头)。', 'error');
    return;
  }

  const settings = getSettings();
  if (settings.apiKeys.some(k => k.key === newKey)) {
    showToast('该 API Key 已存在。', 'error');
    return;
  }

  settings.apiKeys.push({ key: newKey, status: 'unknown' });
  saveSettings(settings);
  apiKeyInput.value = '';
  renderApiKeys();
  showToast('API Key 添加成功！', 'success');
}

function handleDeleteApiKey(keyToDelete) {
    let settings = getSettings();
    settings.apiKeys = settings.apiKeys.filter(k => k.key !== keyToDelete);
    saveSettings(settings);
    renderApiKeys();
    showToast('API Key 已删除。', 'info');
}

async function handleVerifyApiKeys() {
  const originalButtonText = verifyAllKeysBtn.innerHTML;
  verifyAllKeysBtn.disabled = true;
  verifyAllKeysBtn.innerHTML = '验证中...';

  const settings = getSettings();
  const keysToVerify = settings.apiKeys.filter(k => k.status !== 'valid');

  if (keysToVerify.length === 0) {
      showToast('所有 Key 均已验证为有效。', 'info');
      verifyAllKeysBtn.disabled = false;
      verifyAllKeysBtn.innerHTML = originalButtonText;
      return;
  }
  
  // 使用 Promise.all 并行验证所有待测 Key
  await Promise.all(keysToVerify.map(async (keyObj) => {
    const isValid = await verifyApiKey(keyObj.key);
    const keyIndex = settings.apiKeys.findIndex(k => k.key === keyObj.key);
    if (keyIndex !== -1) {
      settings.apiKeys[keyIndex].status = isValid ? 'valid' : 'invalid';
    }
  }));

  saveSettings(settings);
  renderApiKeys();
  verifyAllKeysBtn.disabled = false;
  verifyAllKeysBtn.innerHTML = originalButtonText;
  showToast('API Key 验证完成！', 'success');
}

function handleTemperatureChange(event) {
  const newTemp = parseFloat(event.target.value);
  temperatureValueSpan.textContent = newTemp.toFixed(1);
  const settings = getSettings();
  settings.aiParams.temperature = newTemp;
  saveSettings(settings);
}

function handlePromptChange(event) {
  const newPrompt = event.target.value;
  const settings = getSettings();
  settings.aiParams.prompt = newPrompt;
  saveSettings(settings);
}

async function handleModelImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  showToast('正在处理图片...', 'info');
  try {
    const base64Image = await processImage(file);
    const settings = getSettings();
    settings.modelImage = base64Image;
    saveSettings(settings);
    renderModelImage();
    showToast('全身照更新成功！', 'success');
  } catch (error) {
    showToast(`图片处理失败: ${error}`, 'error');
  }
  // 重置 file input 以允许用户再次上传相同文件
  event.target.value = '';
}

function handleBackNavigation() {
  window.location.href = 'index.html';
}


// --- 4. 初始化函数 ---
// 页面加载完成后，执行此函数来启动所有功能

function init() {
  // 首次加载时，渲染所有数据
  renderApiKeys();
  renderAiParams();
  renderModelImage();

  // 绑定事件监听器
  addApiKeyBtn.addEventListener('click', handleAddApiKey);
  verifyAllKeysBtn.addEventListener('click', handleVerifyApiKeys);
  
  temperatureSlider.addEventListener('input', handleTemperatureChange);
  // 使用 'blur' 事件代替 'input' 来避免频繁写入 localStorage
  promptTextarea.addEventListener('blur', handlePromptChange);

  // 事件委托：为整个列表容器添加一个点击事件监听器
  apiKeyListContainer.addEventListener('click', (event) => {
    // 检查被点击的元素或其父元素是否是删除按钮
    const deleteButton = event.target.closest('.delete-key-btn');
    if (deleteButton) {
      const key = deleteButton.dataset.key;
      handleDeleteApiKey(key);
    }
  });

  // 图片上传逻辑
  modelImageUploadContainer.appendChild(modelImageFileInput);
  modelImageUploadContainer.addEventListener('click', () => modelImageFileInput.click());
  modelImageFileInput.addEventListener('change', handleModelImageUpload);

  // 返回按钮导航
  backBtn.addEventListener('click', handleBackNavigation);
}

// 当整个页面的 HTML 加载并解析完成后，执行初始化函数
document.addEventListener('DOMContentLoaded', init);