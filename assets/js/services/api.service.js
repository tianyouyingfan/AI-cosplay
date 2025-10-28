/**
 * @file api.service.js
 * @description 封装所有与 Google AI API 的交互。
 */

import { getSettings, saveSettings } from './storage.service.js';

// Google AI Studio Gemini API 的基础 URL。
// 注意：标准的 'gemini-pro-vision' 模型只能输出文本，不能生成图片。
// 此处我们假设存在一个支持图像生成的自定义模型端点。
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

/**
 * 从存储的 API Keys 中获取下一个可用的 Key。
 * 实现轮询和无效 Key 跳过逻辑。
 * @private
 * @returns {object | null} 返回找到的 key 对象 { key, status } 或 null。
 */
function _getNextAvailableKey() {
  const settings = getSettings();
  const { apiKeys, lastUsedApiKeyIndex } = settings;

  if (!apiKeys || apiKeys.length === 0) {
    return null;
  }

  // 从上一个使用过的 key 的下一个开始，最多检查一圈
  for (let i = 0; i < apiKeys.length; i++) {
    const currentIndex = (lastUsedApiKeyIndex + 1 + i) % apiKeys.length;
    const currentKey = apiKeys[currentIndex];

    // 我们使用状态为 'unknown' 或 'valid' 的 key，跳过已确认为 'invalid' 的 key
    if (currentKey.status !== 'invalid') {
      // 找到了一个可用的 key，更新索引并保存
      settings.lastUsedApiKeyIndex = currentIndex;
      saveSettings(settings);
      return currentKey;
    }
  }

  // 循环一圈后没有找到可用的 key
  return null;
}

/**
 * 更新 localStorage 中特定 API Key 的状态。
 * @private
 * @param {string} keyString 要更新状态的 API Key。
 * @param {'valid' | 'invalid' | 'unknown'} status 新的状态。
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
 * 调用 AI API 执行虚拟换装。
 * @param {string} modelImageBase64 用户的全身照 (Base64)。
 * @param {string} garmentImageBase64 服装照片 (Base64)。
 * @param {object} aiParams 包含 temperature 和 prompt 的 AI 参数对象。
 * @returns {Promise<string>} 返回一个 Promise，成功时 resolve 生成图片的 Base64 字符串。
 */
export async function generateTryOn(modelImageBase64, garmentImageBase64, aiParams) {
  const availableKey = _getNextAvailableKey();
  if (!availableKey) {
    throw new Error('没有配置或所有API Key均无效。');
  }
  const apiKey = availableKey.key;

  // 从 Base64 字符串中移除数据URI前缀
  const cleanModelImage = modelImageBase64.split(',')[1];
  const cleanGarmentImage = garmentImageBase64.split(',')[1];

  const requestBody = {
    contents: [{
      parts: [
        { text: aiParams.prompt.replace('[服装]', '') }, // 移除占位符，因为图片已作为输入
        { inlineData: { mimeType: 'image/jpeg', data: cleanModelImage } },
        { inlineData: { mimeType: 'image/jpeg', data: cleanGarmentImage } }
      ]
    }],
    generationConfig: {
      temperature: aiParams.temperature,
      candidateCount: 1,
      // 假设API会返回图片，这里可以添加相关参数
    }
  };

  try {
    const response = await fetch(`${API_BASE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      // 如果API返回错误，特别是关于Key无效的错误，更新Key的状态
      if (data.error && data.error.message.toLowerCase().includes('api key not valid')) {
        _updateApiKeyStatus(apiKey, 'invalid');
      }
      throw new Error(data.error?.message || `HTTP 错误: ${response.status}`);
    }

    // --- 关键假设 ---
    // 检查API响应是否因为安全策略等原因被阻止
    if (!data.candidates || data.candidates.length === 0 || data.candidates[0].finishReason === 'SAFETY') {
      throw new Error('生成请求被安全策略阻止。');
    }
    // 假设生成的图片在响应的这个位置
    const generatedImageBase64 = data.candidates[0]?.content?.parts[0]?.inlineData?.data;
    if (!generatedImageBase64) {
      throw new Error('API响应格式不正确，未找到生成的图片。');
    }
    
    // 如果请求成功，我们认为这个key是有效的
    _updateApiKeyStatus(apiKey, 'valid');

    return `data:image/jpeg;base64,${generatedImageBase64}`;

  } catch (error) {
    // 捕获网络错误等
    console.error('API 调用失败:', error);
    // 将错误向上抛出，让UI层处理
    throw error;
  }
}

/**
 * 验证单个 API Key 的有效性。
 * 通过一个轻量的只读请求（如列出模型）来测试。
 * @param {string} apiKey 要验证的 API Key。
 * @returns {Promise<boolean>} 返回一个 Promise，resolve true (有效) 或 false (无效)。
 */
export async function verifyApiKey(apiKey) {
  const verifyUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const response = await fetch(verifyUrl);
    // 只要请求成功 (200 OK)，就认为 key 是有效的
    return response.ok;
  } catch (error) {
    // 网络错误等情况，也认为是无效的
    return false;
  }
}