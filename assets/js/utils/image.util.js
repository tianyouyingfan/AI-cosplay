/**
 * @file image.util.js
 * @description 存放与图片处理相关的可复用工具函数。
 */

/**
 * 验证并处理用户上传的图片文件。
 * 这个函数会检查文件类型、大小，然后将其压缩并转换为 Base64 字符串。
 *
 * @param {File} file - 用户通过 <input type="file"> 选择的文件对象。
 * @param {object} options - 处理选项。
 * @param {number} [options.maxSizeMB=5] - 允许的最大文件大小（单位：MB）。
 * @param {number} [options.maxWidthOrHeight=1024] - 图片缩放后的最大宽度或高度。
 * @param {number} [options.compressionQuality=0.85] - JPEG 压缩质量 (0 到 1)。
 * @returns {Promise<string>} 返回一个 Promise，成功时 resolve 图片的 Base64 字符串，失败时 reject 错误信息。
 */
export function processImage(file, options = {}) {
  // 返回一个 Promise，因为图片处理是异步的
  return new Promise((resolve, reject) => {
    // --- 1. 设置默认选项 ---
    const {
      maxSizeMB = 5,
      maxWidthOrHeight = 1024,
      compressionQuality = 0.85
    } = options;

    // --- 2. 验证文件类型 ---
    if (!file.type.startsWith('image/')) {
      return reject('文件不是有效的图片格式。');
    }

    // --- 3. 验证文件大小 ---
    if (file.size > maxSizeMB * 1024 * 1024) {
      return reject(`图片大小不能超过 ${maxSizeMB}MB。`);
    }

    // --- 4. 使用 FileReader 读取文件 ---
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // --- 5. 使用 Canvas 进行缩放和压缩 ---
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let { width, height } = img;

        // 计算缩放比例
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height *= maxWidthOrHeight / width;
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width *= maxWidthOrHeight / height;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 在 canvas 上绘制缩放后的图片
        ctx.drawImage(img, 0, 0, width, height);

        // --- 6. 将 Canvas 内容转换为 Base64 字符串 ---
        // 使用 'image/jpeg' 格式可以有效压缩图片体积
        const dataUrl = canvas.toDataURL('image/jpeg', compressionQuality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject('无法加载图片，文件可能已损坏。');
      };

      // 将 FileReader 读取的结果设置为图片源
      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject('读取文件时发生错误。');
    };

    // 开始读取文件
    reader.readAsDataURL(file);
  });
}