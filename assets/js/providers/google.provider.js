/**
 * @file google.provider.js
 * @description Google AI API (REST) 服务提供商的实现。
 */

import { getSettings, saveSettings } from '../services/storage.service.js';

const MODEL_NAME = 'gemini-2.5-flash-image-preview';
const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

/**
 * 从 Base64 数据 URI 中提取 MIME 类型和纯 Base64 数据。
 * @param {string} base64String - 例如 "data:image/png;base64,iVBORw0KGgo..."
 * @returns {{mimeType: string, data: string}}
 * @private
 */
function _parseBase64(base64String) {
  const match = base64String.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    throw new Error('无效的 Base64 图像格式。');
  }
  return {
    mimeType: match[1],
    data: match[2],
  };
}


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
  
  const availableKeys = apiKeys.filter(k => k.status !== 'invalid');
  if (availableKeys.length === 0) {
    return null;
  }

  // Find the index of the last used key within the availableKeys array
  const lastUsedKey = apiKeys[lastUsedApiKeyIndex];
  const lastUsedIndexInAvailable = lastUsedKey ? availableKeys.findIndex(k => k.key === lastUsedKey.key) : -1;
  
  const nextIndexInAvailable = (lastUsedIndexInAvailable + 1) % availableKeys.length;
  const nextKey = availableKeys[nextIndexInAvailable];
  
  // Find the original index of the chosen key to save it correctly
  const originalIndex = apiKeys.findIndex(k => k.key === nextKey.key);
  settings.lastUsedApiKeyIndex = originalIndex;
  saveSettings(settings);
  
  return nextKey;
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
 * 使用 Google AI REST API 生成图片。
 * @param {{ modelImage: string, garmentImage: string, temperature: number, prompt: string }} params - API 请求参数。
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
    const modelImageData = _parseBase64(modelImage);
    const garmentImageData = _parseBase64(garmentImage);

    onProgress({ status: 'requesting', progress: 25 });

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: modelImageData.mimeType, data: modelImageData.data } },
            { inline_data: { mime_type: garmentImageData.mimeType, data: garmentImageData.data } },
          ],
        },
      ],
      generation_config: {
        temperature: temperature,
        // response_mime_type can be set here if needed, e.g., "image/png"
      },
    };

    const url = `${API_URL_BASE}${MODEL_NAME}:generateContent?key=${apiKey}`;

    onProgress({ status: 'running', progress: 50 });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    onProgress({ status: 'processing', progress: 75 });

    if (!response.ok) {
      const errorData = await response.json();
      if (errorData.error && errorData.error.message.toLowerCase().includes('api key not valid')) {
        _updateApiKeyStatus(apiKey, 'invalid');
      }
      throw new Error(`API 请求失败: ${errorData.error ? errorData.error.message : response.statusText}`);
    }

    const result = await response.json();

    if (!result.candidates || result.candidates.length === 0 || result.candidates[0].finishReason === 'SAFETY') {
      throw new Error('生成请求被安全策略阻止或未返回有效结果。');
    }

    const generatedPart = result.candidates[0].content.parts.find(part => part.inline_data);
    if (!generatedPart || !generatedPart.inline_data) {
      throw new Error('API响应格式不正确，未找到生成的图片数据。');
    }
    
    _updateApiKeyStatus(apiKey, 'valid');
    onProgress({ status: 'succeeded', progress: 100 });

    const mimeType = generatedPart.inline_data.mime_type || 'image/png';
    return `data:${mimeType};base64,${generatedPart.inline_data.data}`;

  } catch (error) {
    onProgress({ status: 'failed' });
    console.error('Google AI API 调用失败:', error);
    throw error; // Re-throw the error to be caught by the UI layer
  }
}

/**
 * 验证单个 Google API Key 的有效性。
 * 注意：此函数现在也使用 REST API。
 * @param {string} apiKey 要验证的 API Key。
 * @returns {Promise<boolean>} 返回 true (有效) 或 false (无效)。
 */
export async function verifyApiKey(apiKey) {
  try {
    const url = `${API_URL_BASE}${MODEL_NAME}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "test" }] }] }),
    });

    const data = await response.json();
    if (response.ok) {
      return true;
    }
    // Check for specific API key error message
    if (data.error && data.error.message.toLowerCase().includes('api key not valid')) {
      return false;
    }
    // If it's another error (e.g. billing, quota), we might still consider the key "valid" for the purpose of this check
    // but for simplicity, any error during this basic check will be treated as a validation failure.
    return !data.error;

  } catch (error) {
    console.error('Google API Key 验证失败:', error);
    return false;
  }
}
