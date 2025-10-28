/**
 * @file generator.js
 * @description AI 虚拟换装生成页面的所有交互逻辑。
 */

import { getSettings } from './services/storage.service.js';
import { generateImage } from './services/api.service.js';
import { processImage } from './utils/image.util.js';
import { showToast } from './utils/dom.util.js';

// --- 1. DOM 元素选择 ---
const garmentUploadBox = document.getElementById('garmentUploadBox');
const garmentImagePreview = document.getElementById('garmentImagePreview');
const garmentUploadInfo = document.getElementById('garmentUploadInfo');
const selectImageBtn = document.getElementById('selectImageBtn');

const generateBtn = document.getElementById('generateBtn');
const resultContainer = document.getElementById('resultContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultImage = document.getElementById('resultImage');
const resultActions = document.getElementById('resultActions');
const saveBtn = document.getElementById('saveBtn');
const shareBtn = document.getElementById('shareBtn');
const settingsBtn = document.getElementById('settingsBtn');

const progressIndicator = document.getElementById('progress-indicator');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

// 创建一个隐藏的文件输入框
const garmentFileInput = document.createElement('input');
garmentFileInput.type = 'file';
garmentFileInput.accept = 'image/*';
garmentFileInput.style.display = 'none';

// --- 2. 应用状态管理 ---
// 使用一个简单的对象来存储当前页面的状态
const pageState = {
  garmentImageBase64: null,
  generatedImageBase64: null,
  isGenerating: false,
};

// --- 3. 渲染/UI更新函数 ---

/**
 * 更新 UI 以反映是否正在生成。
 * @param {boolean} generating - 是否正在生成。
 */
function setGeneratingState(generating) {
  pageState.isGenerating = generating;
  generateBtn.disabled = generating;
  garmentFileInput.disabled = generating; // Disable file input during generation
  
  if (generating) {
    generateBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      生成中...
    `;
    loadingIndicator.classList.remove('hidden');
    resultImage.classList.add('hidden');
    resultActions.classList.add('hidden');
    progressIndicator.classList.remove('hidden'); // Show progress indicator
    progressBar.style.width = '0%'; // Reset progress bar
    progressText.textContent = '正在初始化...'; // Reset progress text
  } else {
    generateBtn.innerHTML = `
      <span class="material-symbols-outlined">auto_awesome</span>
      <span class="truncate">Generate Try-On</span>
    `;
    loadingIndicator.classList.add('hidden');
    progressIndicator.classList.add('hidden'); // Hide progress indicator
  }
}

// --- 4. 事件处理函数 ---

async function handleGarmentImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  showToast('正在处理服装图片...', 'info');
  try {
    const base64Image = await processImage(file, { maxWidthOrHeight: 512 }); // 服装图可以小一些
    pageState.garmentImageBase64 = base64Image;
    
    // 更新UI显示预览
    garmentImagePreview.src = base64Image;
    garmentImagePreview.classList.remove('hidden');
    garmentUploadInfo.classList.add('hidden'); // 隐藏上传提示文字

    showToast('服装图片上传成功！', 'success');
  } catch (error) {
    showToast(`图片处理失败: ${error}`, 'error');
  } finally {
    event.target.value = ''; // 允许再次上传同名文件
  }
}

async function handleGenerate() {
  const settings = getSettings();

  // 前置条件检查
  if (!settings.modelImage) {
    showToast('请先在设置页面上传您的全身照。', 'error');
    return;
  }
  if (!pageState.garmentImageBase64) {
    showToast('请先上传一件服装的图片。', 'error');
    return;
  }
  // Check for API keys based on selected provider
  if (settings.apiProvider === 'google' && (!settings.apiKeys || settings.apiKeys.filter(k => k.status !== 'invalid').length === 0)) {
    showToast('请先在设置页面添加一个有效的 Google AI API Key。', 'error');
    return;
  }
  if (settings.apiProvider === 'grsai' && !settings.grsaiApiKey) {
    showToast('请先在设置页面添加 Grsai API Key。', 'error');
    return;
  }


  setGeneratingState(true); // This will now show the progress indicator

  try {
    const onProgress = ({ status, progress }) => {
      let message = '';
      switch (status) {
        case 'starting':
          message = '正在启动生成任务...';
          break;
        case 'requesting':
          message = '正在请求 API...';
          break;
        case 'pending':
          message = '任务已提交，等待处理...';
          break;
        case 'running':
          message = `生成中... ${progress}%`;
          break;
        case 'processing':
          message = '正在处理结果...';
          break;
        case 'succeeded':
          message = '生成成功！';
          break;
        case 'failed':
          message = '生成失败。';
          break;
        default:
          message = '未知状态...';
      }
      progressText.textContent = message;
      if (progress !== undefined) {
        progressBar.style.width = `${progress}%`;
      }
    };

    const resultBase64 = await generateImage(
      {
        modelImage: settings.modelImage,
        garmentImage: pageState.garmentImageBase64,
      },
      onProgress
    );
    
    pageState.generatedImageBase64 = resultBase64;
    resultImage.src = resultBase64;
    resultImage.classList.remove('hidden');
    resultActions.classList.remove('hidden');
    showToast('生成成功！', 'success');

  } catch (error) {
    showToast(`生成失败: ${error.message}`, 'error');
    // 失败时，确保结果区域是隐藏的
    resultImage.classList.add('hidden');
    resultActions.classList.add('hidden');
  } finally {
    setGeneratingState(false); // This will now hide the progress indicator
  }
}

function handleSaveImage() {
  if (!pageState.generatedImageBase64) return;

  const link = document.createElement('a');
  link.href = pageState.generatedImageBase64;
  link.download = `ai_try_on_${Date.now()}.jpeg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('图片已开始下载！', 'success');
}

async function handleShareImage() {
  if (!pageState.generatedImageBase64) return;

  // 检查浏览器是否支持 Web Share API
  if (!navigator.share) {
    showToast('您的浏览器不支持分享功能。', 'error');
    return;
  }

  try {
    // 将 Base64 转换为 Blob，然后转换为 File 对象
    const response = await fetch(pageState.generatedImageBase64);
    const blob = await response.blob();
    const file = new File([blob], `ai_try_on_${Date.now()}.jpeg`, { type: blob.type });

    await navigator.share({
      title: '我的 AI 虚拟试穿',
      text: '看看我的新造型！',
      files: [file],
    });
  } catch (error) {
    // 用户取消分享时也会触发error，所以只在不是取消错误时提示
    if (error.name !== 'AbortError') {
      showToast(`分享失败: ${error.message}`, 'error');
    }
  }
}

function handleSettingsNavigation() {
  window.location.href = 'settings.html';
}


// --- 5. 初始化函数 ---

function init() {
  // 将隐藏的文件输入框添加到页面
  document.body.appendChild(garmentFileInput);

  // 绑定事件监听器
  garmentUploadBox.addEventListener('click', () => garmentFileInput.click());
  selectImageBtn.addEventListener('click', () => garmentFileInput.click());
  garmentFileInput.addEventListener('change', handleGarmentImageUpload);

  generateBtn.addEventListener('click', handleGenerate);
  saveBtn.addEventListener('click', handleSaveImage);
  shareBtn.addEventListener('click', handleShareImage);
  settingsBtn.addEventListener('click', handleSettingsNavigation);

  // 初始时隐藏结果操作按钮
  resultActions.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', init);