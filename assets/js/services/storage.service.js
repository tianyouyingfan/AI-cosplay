/**
 * @file storage.service.js
 * @description 封装与浏览器 localStorage 的所有交互，用于持久化应用设置。
 * 这是应用的“单一数据源 (Single Source of Truth)”。
 */

// 使用一个固定的键来存储我们应用的所有数据，避免与浏览器中其他应用冲突。
const SETTINGS_STORAGE_KEY = 'aiVirtualTryOnSettings';

/**
 * 定义应用的默认设置结构。
 * 当用户首次使用或清除缓存时，将使用此对象。
 */
const DEFAULT_SETTINGS = {
  // API Keys 列表，每个key是一个对象
  apiKeys: [], // 示例: [{ key: 'xxxx', status: 'unknown' | 'valid' | 'invalid' }]
  // AI 模型参数
  aiParams: {
    temperature: 0.7,
    prompt: '一个穿着[服装]的时尚人士的超逼真全身照，背景简洁。'
  },
  // 用户的全身照 (模型图)，以 Base64 格式存储
  modelImage: null,
  // 用于 API Key 轮询的索引记录
  lastUsedApiKeyIndex: -1
};

/**
 * 从 localStorage 加载设置。
 * 如果 localStorage 中没有设置，则返回默认设置。
 * 这个函数会智能合并存储的设置和默认设置，以应对未来版本中新增的设置项。
 * @returns {object} 应用的设置对象。
 */
export function getSettings() {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);
      // 将加载的设置与默认设置合并，确保所有键都存在
      return { ...DEFAULT_SETTINGS, ...parsedSettings };
    } else {
      // 如果没有存储的设置，返回默认设置的深拷贝
      return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
  } catch (error) {
    console.error("无法从 localStorage 加载设置:", error);
    // 如果解析出错，同样返回默认设置
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}

/**
 * 将新的设置对象保存到 localStorage。
 * @param {object} newSettings - 要保存的完整设置对象。
 * @returns {boolean} 如果保存成功则返回 true，否则返回 false。
 */
export function saveSettings(newSettings) {
  try {
    const settingsString = JSON.stringify(newSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, settingsString);
    return true;
  } catch (error) {
    console.error("无法向 localStorage 保存设置:", error);
    // 可能会因为存储已满等原因失败
    return false;
  }
}