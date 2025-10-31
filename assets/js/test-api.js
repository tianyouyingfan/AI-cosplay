export function init() {
    const testBtn = document.getElementById('testBtn');
    if (!testBtn) return; // Don't run if the element isn't on the page

    testBtn.addEventListener('click', async () => {
        const apiKeyInput = document.querySelector('#test-api #apiKey');
        const resultDiv = document.querySelector('#test-api #result');

        if (!apiKeyInput || !resultDiv) return;

        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            resultDiv.className = 'mt-4 p-4 rounded bg-red-100 text-red-700';
            resultDiv.textContent = '请输入 API Key';
            resultDiv.classList.remove('hidden');
            return;
        }

        resultDiv.className = 'mt-4 p-4 rounded bg-blue-100 text-blue-700';
        resultDiv.textContent = '正在测试...';
        resultDiv.classList.remove('hidden');

        try {
            // This assumes the GoogleGenAI constructor is available globally
            // from the script tag in index.html
            const { GoogleGenerativeAI } = window.genai;
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro"});
            const result = await model.generateContent("test");
            const response = await result.response;

            if (response) {
                resultDiv.className = 'mt-4 p-4 rounded bg-green-100 text-green-700';
                resultDiv.textContent = `✅ API Key 有效！成功接收到模型的响应。`;
            } else {
                throw new Error('API 响应为空。');
            }
        } catch (error) {
            console.error("API Test Error:", error);
            resultDiv.className = 'mt-4 p-4 rounded bg-red-100 text-red-700';
            resultDiv.textContent = `❌ 测试失败: ${error.message}`;
        }
    });
}
