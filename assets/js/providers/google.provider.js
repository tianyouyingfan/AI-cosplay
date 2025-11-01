/**
 * @file google.provider.js
 * @description Google AI Studio API 服务提供商的实现。
 */

import { GoogleGenerativeAI } from 'https://cdn.jsdelivr.net/npm/@google/generative-ai@0.24.1/+esm';
import { getSettings, saveSettings } from '../services/storage.service.js';

const MODEL_NAME = 'gemini-pro-vision'; // Using a standard model name

/**
 * 从存储的 API Keys 中获取下一个可用的 Key。
 * @private
 */
function _getNextAvailableKey() {
  const settings = getSettings();
  const { apiKeys, lastUsedApiKeyIndex } = settings;

  if (!apiKeys || apiKeys.length === 0) {
    return null;
  }

  for (let i = 0; i < apiKeys.length; i++) {
    const currentIndex = (lastUsedApiKeyIndex + 1 + i) % apiKeys.length;
    const currentKey = apiKeys[currentIndex];

    if (currentKey.status !== 'invalid') {
      settings.lastUsedApiKeyIndex = currentIndex;
      saveSettings(settings);
      return currentKey;
    }
  }
  return null;
}

/**
 * 更新 localStorage 中特定 API Key 的状态。
 * @private
 */
function _updateApiKeyStatus(keyString, status) {
  const settings = getSettings();
  const keyIndex = settings.apiKeys.findIndex(k => k.key === keyString);
  if (keyIndex !== -1) {
    settings.apiKeys[keyIndex].status = status;
    saveSettings(settings);
  }
}

/**
 * 使用 Google AI API 生成图片。
 * @param {{ apiKey: string, prompt: string, modelImage: string, garmentImage: string, temperature: number }} params - API 请求参数。
 * @param {function(object): void} onProgress - 进度回调函数。
 * @returns {Promise<string>} - 返回生成的图片 Base64 字符串。
 */
export async function generateImage(params, onProgress) {
  const { modelImage, garmentImage, temperature, prompt } = params;
  
  const availableKey = _getNextAvailableKey();
  if (!availableKey) {
    throw new Error('没有配置或所有Google API Key均无效。');
  }
  const apiKey = availableKey.key;

  onProgress({ status: 'starting', progress: 0 });

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: MODEL_NAME });

    onProgress({ status: 'requesting', progress: 25 });

    const imageParts = [
      { inlineData: { mimeType: 'image/jpeg', data: modelImage.split(',')[1] } },
      { inlineData: { mimeType: 'image/jpeg', data: garmentImage.split(',')[1] } },
    ];

    onProgress({ status: 'running', progress: 50 });

    const result = await model.generateContent([prompt, ...imageParts], {
        temperature,
    });

    onProgress({ status: 'processing', progress: 75 });

    const response = result.response;
    if (!response.candidates || response.candidates.length === 0 || response.candidates[0].finishReason === 'SAFETY') {
        throw new Error('生成请求被安全策略阻止或未返回结果。');
    }

    const generatedImagePart = response.candidates[0].content.parts.find(part => part.inlineData);
    if (!generatedImagePart || !generatedImagePart.inlineData.data) {
      throw new Error('API响应格式不正确，未找到生成的图片。');
    }

    _updateApiKeyStatus(apiKey, 'valid');
    onProgress({ status: 'succeeded', progress: 100 });

    return `data:image/jpeg;base64,${generatedImagePart.inlineData.data}`;

  } catch (error) {
    if (error.message && error.message.toLowerCase().includes('api key not valid')) {
      _updateApiKeyStatus(apiKey, 'invalid');
    }
    onProgress({ status: 'failed' });
    console.error('Google AI API 调用失败:', error);
    throw error;
  }
}

/**
 * 验证单个 Google API Key 的有效性。
 * @param {string} apiKey 要验证的 API Key。
 * @returns {Promise<boolean>} 返回 true (有效) 或 false (无效)。
 */
export async function verifyApiKey(apiKey) {
  try {
    const client = new GoogleGenerativeAI(apiKey);
    // A simple way to verify is to list models, but this might not be available in all environments.
    // A more robust check might be needed depending on the library's capabilities.
    await client.getGenerativeModel({ model: MODEL_NAME }).generateContent('test');
    return true;
  } catch (error) {
    console.error('Google API Key 验证失败:', error);
    return false;
  }
}
