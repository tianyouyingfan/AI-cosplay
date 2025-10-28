/**
 * @file api.service.js
 * @description 封装所有与 Google AI API 的交互。
 */

import { getSettings, saveSettings } from './storage.service.js';

// Google AI Studio Gemini 模型名称
const MODEL_NAME = 'gemini-2.5-flash-image-preview';

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

  try {
    // 初始化 Google GenAI 客户端
    const client = new GoogleGenAI({ apiKey });

    // 构建请求内容
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: aiParams.prompt.replace('[服装]', '') // 移除占位符，因为图片已作为输入
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: modelImageBase64.split(',')[1] // 移除数据URI前缀
            }
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: garmentImageBase64.split(',')[1] // 移除数据URI前缀
            }
          }
        ]
      }
    ];

    // 生成配置
    const generationConfig = {
      temperature: aiParams.temperature,
      candidateCount: 1,
    };

    // 调用 Gemini API
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      generationConfig: generationConfig
    });

    // 检查响应
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('API未返回任何候选结果。');
    }

    const candidate = response.candidates[0];

    // 检查是否因安全策略被阻止
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('生成请求被安全策略阻止。');
    }

    // 尝试获取生成的图片
    const generatedImagePart = candidate.content.parts.find(part => part.inline_data);
    if (!generatedImagePart || !generatedImagePart.inline_data.data) {
      throw new Error('API响应格式不正确，未找到生成的图片。');
    }

    // 标记API Key为有效
    _updateApiKeyStatus(apiKey, 'valid');

    return `data:image/jpeg;base64,${generatedImagePart.inline_data.data}`;

  } catch (error) {
    // 检查是否是API Key无效的错误
    if (error.message && error.message.toLowerCase().includes('api key not valid')) {
      _updateApiKeyStatus(apiKey, 'invalid');
    }

    console.error('API 调用失败:', error);
    throw error;
  }
}

/**
 * 验证单个 API Key 的有效性。
 * 通过初始化 Google GenAI 客户端并测试连接来验证。
 * @param {string} apiKey 要验证的 API Key。
 * @returns {Promise<boolean>} 返回一个 Promise，resolve true (有效) 或 false (无效)。
 */
export async function verifyApiKey(apiKey) {
  try {
    // 初始化 Google GenAI 客户端
    const client = new GoogleGenAI({ apiKey });

    // 尝试获取模型列表来验证API Key
    const response = await client.models.list();

    // 如果成功获取到模型列表，认为API Key有效
    return Array.isArray(response.models) && response.models.length > 0;
  } catch (error) {
    console.error('API Key 验证失败:', error);
    // 任何错误都认为API Key无效
    return false;
  }
}