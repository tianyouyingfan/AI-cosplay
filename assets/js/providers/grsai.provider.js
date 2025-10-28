/**
 * @file grsai.provider.js
 * @description Grsai API 服务提供商的实现。
 */

const GRSAI_API_HOST = 'https://grsai.dakka.com.cn';
const DRAW_ENDPOINT = '/v1/draw/nano-banana';
const RESULT_ENDPOINT = '/v1/draw/result';

const POLLING_INTERVAL = 2000; // 2 seconds
const POLLING_TIMEOUT = 120000; // 2 minutes

/**
 * 使用 Grsai API 生成图片。
 * @param {{ apiKey: string, prompt: string, modelImage: string, aspectRatio: string }} params - API 请求参数。
 * @param {function(object): void} onProgress - 进度回调函数。
 * @returns {Promise<string>} - 返回生成的图片 URL。
 */
export async function generateImage(params, onProgress) {
  const { apiKey, prompt, modelImage, aspectRatio = 'auto' } = params;

  onProgress({ status: 'starting', progress: 0 });

  // 1. 发起绘画任务
  const taskId = await _startDrawingTask(apiKey, prompt, modelImage, aspectRatio, onProgress);

  // 2. 轮询获取结果
  const imageUrl = await _pollForResult(apiKey, taskId, onProgress);

  return imageUrl;
}

async function _startDrawingTask(apiKey, prompt, modelImage, aspectRatio, onProgress) {
  onProgress({ status: 'requesting', progress: 5 });
  const requestBody = {
    model: 'nano-banana-fast',
    prompt,
    aspectRatio,
    webHook: '-1', // Important: Use polling mode
  };

  // Grsai API expects URLs for reference images. The modelImage from settings is a Base64 string.
  // Therefore, we are not including modelImage in the Grsai request to prevent errors.
  // If modelImage functionality is crucial for Grsai, a separate image upload mechanism would be required.
  // if (modelImage) {
  //   requestBody.urls = [modelImage]; // Assuming modelImage is a URL. If it's base64, it needs to be uploaded or converted first.
  // }

  try {
    const response = await fetch(`${GRSAI_API_HOST}${DRAW_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ msg: response.statusText }));
      throw new Error(`Failed to start task: ${errorData.msg || 'Unknown error'}`);
    }

    const result = await response.json();
    if (result.code !== 0 || !result.data || !result.data.id) {
      throw new Error(`Invalid response from start task: ${result.msg}`);
    }

    onProgress({ status: 'pending', progress: 10 });
    return result.data.id;
  } catch (error) {
    onProgress({ status: 'failed' });
    throw new Error(`Network or API error while starting task: ${error.message}`);
  }
}

async function _pollForResult(apiKey, taskId, onProgress) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      // Check for timeout
      if (Date.now() - startTime > POLLING_TIMEOUT) {
        onProgress({ status: 'failed' });
        return reject(new Error('Polling timed out after 2 minutes.'));
      }

      try {
        const response = await fetch(`${GRSAI_API_HOST}${RESULT_ENDPOINT}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ id: taskId }),
        });

        if (!response.ok) {
          // Retry on server errors, fail on client errors
          if (response.status >= 500) {
            setTimeout(poll, POLLING_INTERVAL);
            return;
          }
          const errorData = await response.json().catch(() => ({ msg: response.statusText }));
          throw new Error(`Polling failed: ${errorData.msg || 'Unknown error'}`);
        }

        const result = await response.json();

        if (result.code !== 0) {
            // -22 means task does not exist or is finished/cleaned up, stop polling.
            if(result.code === -22) {
                return reject(new Error(`Task not found or expired. (Code: ${result.code})`));
            }
            // For other errors, keep polling for a while.
            setTimeout(poll, POLLING_INTERVAL);
            return;
        }

        const taskData = result.data;

        switch (taskData.status) {
          case 'succeeded':
            if (taskData.results && taskData.results[0] && taskData.results[0].url) {
              onProgress({ status: 'succeeded', progress: 100 });
              resolve(taskData.results[0].url);
            } else {
              reject(new Error('Task succeeded but no image URL was found.'));
            }
            break;
          case 'failed':
            onProgress({ status: 'failed' });
            reject(new Error(`Image generation failed: ${taskData.failure_reason} - ${taskData.error}`));
            break;
          case 'running':
            onProgress({ status: 'running', progress: taskData.progress });
            setTimeout(poll, POLLING_INTERVAL);
            break;
          default:
            // For any other status, keep polling
            setTimeout(poll, POLLING_INTERVAL);
            break;
        }
      } catch (error) {
        onProgress({ status: 'failed' });
        reject(new Error(`Network error during polling: ${error.message}`));
      }
    };

    // Start the first poll
    poll();
  });
}
