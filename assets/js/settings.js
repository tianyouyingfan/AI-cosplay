/**
 * @file settings.js
 * @description 设置页面的所有交互逻辑。
 */

// 使用 Google Generative AI 的 ES 模块导入
import { GoogleGenerativeAI } from "https://cdn.jsdelivr.net/npm/@google/generative-ai@0.24.1/dist/index.mjs";

import { getSettings, saveSettings } from './services/storage.service.js';
import { verifyApiKey } from './services/api.service.js';
import { processImage } from './utils/image.util.js';
import { showToast } from './utils/dom.util.js';

// --- 1. DOM 元素选择 ---
const apiProviderSelect = document.getElementById('apiProviderSelect');
const googleProviderSettings = document.getElementById('googleProviderSettings');
const grsaiProviderSettings = document.getElementById('grsaiProviderSettings');

const apiKeyInput = document.getElementById('apiKeyInput');
const addApiKeyBtn = document.getElementById('addApiKeyBtn');
const apiKeyListContainer = document.getElementById('apiKeyListContainer');
const verifyAllKeysBtn = document.getElementById('verifyAllKeysBtn');

const grsaiApiKeyInput = document.getElementById('grsaiApiKeyInput');
const addGrsaiApiKeyBtn = document.getElementById('addGrsaiApiKeyBtn');

const temperatureSlider = document.getElementById('temperatureSlider');
const temperatureValueSpan = document.getElementById('temperatureValue');
const promptTextarea = document.getElementById('promptTextarea');

const modelImageUploadContainer = document.getElementById('modelImageUploadContainer');
const modelImagePreview = document.getElementById('modelImagePreview');
const backBtn = document.getElementById('backBtn');

const modelImageFileInput = document.createElement('input');
modelImageFileInput.type = 'file';
modelImageFileInput.accept = 'image/*';
modelImageFileInput.style.display = 'none';


// --- 2. 渲染函数 ---

/**
 * 根据选择的 provider 渲染对应的设置区域。
 */
function renderProviderSettings() {
  const { apiProvider } = getSettings();
  apiProviderSelect.value = apiProvider;

  if (apiProvider === 'google') {
    googleProviderSettings.style.display = 'block';
    grsaiProviderSettings.style.display = 'none';
    verifyAllKeysBtn.style.display = 'block';
  } else if (apiProvider === 'grsai') {
    googleProviderSettings.style.display = 'none';
    grsaiProviderSettings.style.display = 'block';
    verifyAllKeysBtn.style.display = 'none'; // Grsai API key is not verifiable with the same method
  }
  renderApiKeys(); // Re-render keys for the selected provider
}

/**
 * 根据 apiKeys 数组渲染 API Key 列表。
 * 现在会根据 provider 区分渲染
 */
function renderApiKeys() {
  const { apiKeys, apiProvider, grsaiApiKey } = getSettings();
  apiKeyListContainer.innerHTML = ''; // 清空现有列表

  if (apiProvider === 'google') {
    if (apiKeys.length === 0) {
      apiKeyListContainer.innerHTML = '<p class="text-slate-500 text-sm text-center py-2">尚未添加任何 Google AI API Key。</p>';
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
  } else if (apiProvider === 'grsai') {
      if (!grsaiApiKey) {
        apiKeyListContainer.innerHTML = '<p class="text-slate-500 text-sm text-center py-2">尚未添加 Grsai API Key。</p>';
        return;
      }
      grsaiApiKeyInput.value = grsaiApiKey;
      // Grsai has a single key, so we don't show a list.
      // The input field itself will show the current key.
      apiKeyListContainer.innerHTML = '';
  }
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

function handleProviderChange(event) {
    const settings = getSettings();
    settings.apiProvider = event.target.value;
    saveSettings(settings);
    renderProviderSettings();
}

function handleAddApiKey() {
  const newKey = apiKeyInput.value.trim();
  if (!newKey || newKey.length < 10) {
    showToast('请输入有效的 Google AI API Key。', 'error');
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
  showToast('Google AI API Key 添加成功！', 'success');
}

function handleAddGrsaiApiKey() {
    const newKey = grsaiApiKeyInput.value.trim();
    if (!newKey || newKey.length < 10) {
        showToast('请输入有效的 Grsai API Key。', 'error');
        return;
    }
    const settings = getSettings();
    settings.grsaiApiKey = newKey;
    saveSettings(settings);
    showToast('Grsai API Key 已保存！', 'success');
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
  event.target.value = '';
}

function handleBackNavigation() {
  window.location.href = 'index.html';
}


// --- 4. 初始化函数 ---

function init() {
  renderProviderSettings();
  renderAiParams();
  renderModelImage();

  // 绑定事件监听器
  apiProviderSelect.addEventListener('change', handleProviderChange);
  addApiKeyBtn.addEventListener('click', handleAddApiKey);
  addGrsaiApiKeyBtn.addEventListener('click', handleAddGrsaiApiKey);
  verifyAllKeysBtn.addEventListener('click', handleVerifyApiKeys);
  
  temperatureSlider.addEventListener('input', handleTemperatureChange);
  promptTextarea.addEventListener('blur', handlePromptChange);

  apiKeyListContainer.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.delete-key-btn');
    if (deleteButton) {
      const key = deleteButton.dataset.key;
      handleDeleteApiKey(key);
    }
  });

  modelImageUploadContainer.appendChild(modelImageFileInput);
  modelImageUploadContainer.addEventListener('click', () => modelImageFileInput.click());
  modelImageFileInput.addEventListener('change', handleModelImageUpload);

  backBtn.addEventListener('click', handleBackNavigation);
}

document.addEventListener('DOMContentLoaded', init);
