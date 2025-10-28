# AI 虚拟试衣间 (AI Virtual Try-On)

> 一款完全运行在浏览器中的纯前端 AI 虚拟换装应用。利用 Google AI Studio 的 API，实现将任意服装图片“穿”在用户指定的模特照片上。本项目注重隐私和易用性，所有敏感信息（如 API Key 和个人照片）均存储在用户本地。

![应用界面截图](./showPoto/show.png)
*(注：上图为项目的设计效果图)*

---

## ✨ 项目简介

AI 虚拟试衣间是一个轻量级的移动端 Web 应用，旨在提供一个简单、快速的 AI 换装体验。与需要后端服务器和复杂部署的传统应用不同，本项目采用纯前端技术栈实现，这意味着：

*   **高隐私性:** 用户的 API Key 和个人照片仅保存在浏览器的 `localStorage` 中，绝不会上传到任何服务器。
*   **零后端成本:** 无需服务器、数据库或云函数，可以直接部署在任何静态网站托管平台（如 GitHub Pages, Vercel, Netlify）。
*   **完全可控:** 用户可以直接使用自己的 Google AI Studio 免费 API Key，对用量和成本有完全的控制。
*   **易于部署和修改:** 整个项目由 HTML, CSS (Tailwind) 和原生 JavaScript构成，代码结构清晰，易于二次开发。

## 🚀 主要功能

*   **服装上传:** 支持用户从手机相册选择或拍摄服装照片，并自动进行压缩和预处理。
*   **模特照设置:** 在设置页面预先上传一张全身照作为换装的基底模特，无需每次生成都重复上传。
*   **AI 生成:** 一键调用 AI 模型，将服装“穿”在模特身上，并展示生成结果。
*   **结果处理:** 支持将生成的图片**保存**到本地相册，或通过系统原生分享功能**分享**给朋友。
*   **API Key 管理:**
    *   支持添加**多个** Google AI API Key。
    *   自动进行**轮询**，以最大化利用免费额度。
    *   提供**批量验证**功能，直观显示每个 Key 的有效状态。
*   **AI 参数自定义:**
    *   可调节模型的**温度 (Temperature)** 参数，以控制生成结果的创造性。
    *   支持自定义**提示词 (Prompt)**，为 AI 提供更精确的生成指导。
*   **数据持久化:** 所有设置（API Keys, AI 参数, 模特照片）都会自动保存在本地，关闭浏览器后依然存在。

## 🛠️ 技术栈

*   **前端框架:** 无。使用 **原生 JavaScript (ES6 模块化)** 构建，以保持项目的轻量和纯粹。
*   **样式方案:** **Tailwind CSS**，通过 CDN 引入，用于快速构建与设计稿一致的响应式界面。
*   **数据存储:** 浏览器 **`localStorage`**，用于持久化用户的所有设置。
*   **核心 API:** **Google AI Studio (Gemini Pro Vision API)** - *详见下面的重要提示*。

## 🏃‍♂️ 如何开始

本项目无需复杂的构建步骤，可以直接在浏览器中运行。

1.  **克隆仓库**
    ```bash
    git clone https://github.com/your-username/ai-virtual-try-on.git
    ```

2.  **本地运行**
    *   进入项目目录 `cd ai-virtual-try-on`。
    *   由于项目使用了 ES 模块，直接用 `file://` 协议打开 HTML 文件可能会遇到 CORS 策略问题。推荐使用一个简单的本地服务器来运行：
        *   如果你安装了 VS Code，可以安装 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) 插件，右键点击 `index.html` 或 `settings.html` 选择 "Open with Live Server"。
        *   或者使用 Python 的简易服务器：`python -m http.server`，然后在浏览器中访问 `http://localhost:8000`。

3.  **配置应用**
    *   首先，在浏览器中打开 `settings.html`。
    *   在 "API KEY 管理" 部分，添加你从 Google AI Studio 获取的 API Key。
    *   在 "我的全身照" 部分，上传一张你想要作为模特的清晰全身照。
    *   （可选）根据需要调整 "AI 模型参数"。

4.  **开始使用**
    *   配置完成后，访问 `index.html`。
    *   上传一件服装的图片。
    *   点击 "Generate Try-On" 按钮，等待 AI 生成结果！

## 📂 项目结构

项目的代码结构清晰且模块化，易于理解和维护。

```
/
├── index.html              # 主界面 (生成界面)
├── settings.html           # 设置界面
└── /assets/
    └── /js/
        ├── /services/
        │   ├── storage.service.js  # 封装 localStorage 逻辑，管理数据读写
        │   └── api.service.js      # 封装所有 Google AI API 调用、Key轮询和错误处理
        ├── /utils/
        │   ├── dom.util.js         # 封装 DOM 操作工具，如 Toast 提示
        │   └── image.util.js       # 封装图片校验、压缩、转换逻辑
        ├── settings.js             # 设置页面的主逻辑脚本
        └── generator.js            # 生成页面的主逻辑脚本
```

## ⚠️ 重要提示：关于 AI 模型

本项目最初的设计是基于调用一个能够执行**图像生成 (Image-to-Image)** 任务的 AI 模型。然而，当前 Google AI Studio 免费提供的 `Gemini Pro Vision` 模型是一个强大的多模态**理解**模型，它可以识别和分析图片内容，但其主要输出是**文本**，本身**不具备直接生成新图片**的能力。

因此，本项目中的 `api.service.js` 文件是作为一个**结构化的占位符**和理想化的实现。它正确地处理了 API Key 轮询、请求构造和错误处理，但如果直接对接标准的 `gemini-pro-vision` 端点，将无法返回图片结果。

要使本项目真正产生预期的图片效果，需要将 `api.service.js` 中的 API 请求部分替换为对接一个真正的图像生成模型 API，例如：

*   **Google Cloud Vertex AI** 中的 **Imagen** 模型。
*   其他第三方服务如 **Stable Diffusion** 的 API。

## 🌟 未来展望

*   [ ] **实现深色模式 (Dark Mode)**，并提供主题切换功能。
*   [ ] **集成真正的图像生成 API**，使项目功能完整可用。
*   [ ] **生成历史记录**，允许用户查看和管理之前生成的图片。
*   [ ] **更丰富的编辑功能**，如调整服装位置、选择生成风格等。

## 📄 许可证 (License)

本项目采用 [MIT](https://opensource.org/licenses/MIT) 许可证。