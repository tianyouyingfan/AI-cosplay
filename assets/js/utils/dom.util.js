/**
 * @file dom.util.js
 * @description 存放与 DOM 操作相关的可复用工具函数。
 */

/**
 * 在页面上显示一个 Toast 消息提示。
 * 这个函数会动态创建一个 div 元素，应用样式，然后将其添加到 body 中。
 * 消息在指定延迟后会自动淡出并移除。
 *
 * @param {string} message - 要显示的消息内容。
 * @param {'success' | 'error' | 'info'} type - 消息类型，决定了 Toast 的背景颜色。
 * @param {number} duration - 消息显示的持续时间（毫秒）。
 */
export function showToast(message, type = 'info', duration = 3000) {
  // --- 1. 创建 Toast 元素 ---
  const toast = document.createElement('div');
  toast.textContent = message;

  // --- 2. 应用基础样式 ---
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '9999px'; // rounded-full
  toast.style.color = 'white';
  toast.style.fontFamily = '"Space Grotesk", "Noto Sans", sans-serif';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = 'bold';
  toast.style.zIndex = '10000';
  toast.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s ease-in-out, top 0.3s ease-in-out';

  // --- 3. 根据类型应用特定颜色 ---
  switch (type) {
    case 'success':
      toast.style.backgroundColor = '#28a745'; // 绿色
      break;
    case 'error':
      toast.style.backgroundColor = '#dc3545'; // 红色
      break;
    case 'info':
    default:
      toast.style.backgroundColor = '#17a2b8'; // 蓝色
      break;
  }

  // --- 4. 添加到 DOM 并触发动画 ---
  document.body.appendChild(toast);

  // 使用 setTimeout 确保元素已添加到 DOM，然后再改变 opacity 和 top 来触发 CSS 过渡
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.top = '40px';
  }, 10);

  // --- 5. 设置定时器以移除 Toast ---
  setTimeout(() => {
    // 开始淡出
    toast.style.opacity = '0';
    toast.style.top = '20px';

    // 在过渡动画结束后从 DOM 中移除元素
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }, duration);
}