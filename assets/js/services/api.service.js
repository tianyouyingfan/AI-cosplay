/**
 * @file api.service.js
 * @description API 服务调度中心。
 * 根据用户设置，将请求分发到相应的服务提供商 (provider)。
 */

import { getSettings } from './storage.service.js';
import * as googleProvider from '../providers/google.provider.js';
import * as grsaiProvider from '../providers/grsai.provider.js';

/**
 * 验证 Google AI API Key 的有效性。
 * 注意：此功能仅适用于 Google Provider。
 * @param {string} apiKey 要验证的 API Key。
 * @returns {Promise<boolean>} 返回 true (有效) 或 false (无效)。
 */
export async function verifyApiKey(apiKey) {
  // 目前的验证逻辑只针对 Google
  return googleProvider.verifyApiKey(apiKey);
}

/**
 * 生成图片的总入口函数。
 * 它会根据用户的设置选择正确的服务提供商，并调用其 generateImage 方法。
 *
 * @param {{ modelImage: string, garmentImage: string }} images - 包含图片的对象。
 * @param {function(object): void} onProgress - 进度回调函数。
 * @returns {Promise<string>} 返回生成的图片 URL 或 Base64 字符串。
 */
export async function generateImage(images, onProgress) {
  const settings = getSettings();
  const { apiProvider, apiKeys, grsaiApiKey, aiParams } = settings;

  if (apiProvider === 'google') {
    if (!apiKeys || apiKeys.length === 0) {
      throw new Error('请在设置中添加 Google AI API Key。');
    }
    const params = {
      ...images,
      temperature: aiParams.temperature,
      prompt: aiParams.prompt,
    };
    return googleProvider.generateImage(params, onProgress);

  } else if (apiProvider === 'grsai') {
    if (!grsaiApiKey) {
      throw new Error('请在设置中添加 Grsai API Key。');
    }
    // Grsai API 需要一个 prompt 和一个可选的参考图 URL。
    // 我们将用户的全身照作为参考图。
    // 注意：Grsai provider 期望 modelImage 是一个 URL。如果它是 base64，需要先上传。
    // 这是一个简化的实现，我们假设 modelImage 已经是可访问的 URL 或 base64 data URI。
    const params = {
      apiKey: grsaiApiKey,
      prompt: aiParams.prompt.replace('[服装]', '这件衣服'), // Adapt prompt for Grsai
      modelImage: images.modelImage, // Pass the user's photo
      // aspectRatio can be added here if supported by the UI
    };
    return grsaiProvider.generateImage(params, onProgress);

  } else {
    throw new Error('未知的 API Provider 或尚未配置。');
  }
}
