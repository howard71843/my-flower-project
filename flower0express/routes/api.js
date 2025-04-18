// --- START OF FILE api.js ---

var express = require("express");
var router = express.Router();
const { InfluxDB, Point } = require('@influxdata/influxdb-client'); // 引入 InfluxDB client
const fetch = require('node-fetch'); // ** Import node-fetch if you are using Node < 18, or ensure your Node version supports global fetch **

// --- InfluxDB Configuration ---
// **重要**: 使用環境變數儲存敏感資訊，特別是在 Render 上部署時
// 在 Render 的 Environment Variables 中設定這些值
const influxUrl = process.env.INFLUXDB_URL || 'https://us-east-1-1.aws.cloud2.influxdata.com'; // 替換為你的 InfluxDB URL 或在環境變數中設定
const influxToken = process.env.INFLUXDB_TOKEN || 'YOUR_INFLUXDB_TOKEN'; // **必須** 在環境變數中設定你的 Token - **Replace or use env var**
const influxOrg = process.env.INFLUXDB_ORG || 'Flower'; // 替換為你的 InfluxDB Org 或在環境變數中設定
const influxBucket = process.env.INFLUXDB_BUCKET || 'login_logs'; // 替換為你的 InfluxDB Bucket 或在環境變數中設定

// +++ Add Logging Here +++
console.log("--- InfluxDB Configuration Check ---");
console.log("InfluxDB URL:", influxUrl);
console.log("InfluxDB Org:", influxOrg);
console.log("InfluxDB Bucket:", influxBucket);
// **NEVER log the full token in production logs**
console.log("InfluxDB Token Loaded:", influxToken && influxToken !== 'YOUR_INFLUXDB_TOKEN' ? `Yes (Length: ${influxToken.length})` : "No / Using Placeholder");
console.log("------------------------------------");
// ++++++++++++++++++++++++
let writeApi; // 將 writeApi 宣告在外面，以便全局檢查

if (!influxUrl || !influxToken || influxToken === 'YOUR_INFLUXDB_TOKEN' || !influxOrg || !influxBucket) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    if (influxToken === 'YOUR_INFLUXDB_TOKEN') {
        console.error("FATAL: InfluxDB Token is set to the placeholder 'YOUR_INFLUXDB_TOKEN'.");
    } else {
        console.error("FATAL: InfluxDB environment variables are missing or incomplete.");
    }
    console.error("Please check INFLUXDB_URL, INFLUXDB_TOKEN, INFLUXDB_ORG, INFLUXDB_BUCKET in your environment.");
    console.error("InfluxDB logging will be disabled.");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    // 在這種情況下，可以選擇讓應用程式崩潰或禁用相關功能
    writeApi = null; // 標記 writeApi 為不可用
} else {
    try {
        // 建立 InfluxDB Client
        const influxDB = new InfluxDB({ url: influxUrl, token: influxToken });
        // 建立 Write API
        writeApi = influxDB.getWriteApi(influxOrg, influxBucket);
        console.log(`✅ InfluxDB Write API successfully configured for Bucket: ${influxBucket}`);

    } catch (initError) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("FATAL: Error initializing InfluxDB client or Write API:");
        console.error(initError);
        console.error("InfluxDB logging will be disabled.");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        writeApi = null; // 標記 writeApi 為不可用
    }
}

// --- Google AI Configuration ---
// **重要**: 將 API Key 儲存在環境變數中更安全
const API_KEY = process.env.GOOGLE_AI_API_KEY || "YOUR_GOOGLE_AI_API_KEY"; // **Replace with your actual key or use environment variable**
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${API_KEY}`;

if (!API_KEY || API_KEY === "YOUR_GOOGLE_AI_API_KEY") {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("WARNING: Google AI API Key is missing or using placeholder.");
    console.error("Please set the GOOGLE_AI_API_KEY environment variable.");
    console.error("Image analysis functionality will likely fail.");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
} else {
    console.log("✅ Google AI API Key Loaded.");
}


let lastMessage = "等待圖片分析..."; // 儲存最新 AI 訊息 (給個初始值)

//儲存 AI 訊息（POST 請求） - 通常由 analyzeImage 更新，但保留此端點
router.post("/setResult", function (req, res) {
    const newMessage = req.body.message;
    if (newMessage !== undefined && newMessage !== null) {
        lastMessage = String(newMessage).trim(); // 確保是字串並移除前後空白
        console.log(`[API /setResult] 💬 Message explicitly set to: "${lastMessage}"`);
        res.json({ status: "success" });
    } else {
        console.warn("[API /setResult] ⚠️ Received request with missing message body.");
        res.status(400).json({ status: "error", message: "Missing 'message' in request body" });
    }
});


// 取得 AI 訊息（GET 請求）- **前端自動刷新會呼叫此 API**
router.get("/getResult", function (req, res) {
    // *** CONSOLE REMINDER FOR AUTO-REFRESH ***
    console.log(`[API /getResult] 🔄 Polled for latest message. Sending: "${lastMessage}"`);
    // *****************************************
    res.json({ message: lastMessage });
});

// 🔹 調用 Google AI Studio 來分析圖片
router.post("/analyzeImage", async function (req, res) {
    // ** Check if API Key is configured **
    if (!API_KEY || API_KEY === "YOUR_GOOGLE_AI_API_KEY") {
         console.error("[API /analyzeImage] ❌ Cannot proceed without Google AI API Key.");
         return res.status(503).json({ error: "Google AI Service not configured on server" });
    }

    const { image } = req.body; // 🔹 從前端獲取 base64 圖片
    console.log("[API /analyzeImage] 📸 Received image analysis request.", image ? "Image data present." : "No image data received!");
    if (!image) {
        return res.status(400).json({ error: "請提供圖片 (No image data provided)" });
    }

    // Extract base64 data (handle potential missing comma)
    const base64Data = image.includes(',') ? image.split(",")[1] : image;
    if (!base64Data) {
        console.error("[API /analyzeImage] ❌ Invalid image data format (missing base64 content).");
        return res.status(400).json({ error: "無效的圖片數據格式 (Invalid image data format)" });
    }

    try {
        const requestBody = {
            contents: [
                {
                    parts: [
                        // { text: "這是什麼？請用三個字回答。" }, // Google AI 提問 (原版)
                        // More robust prompt:
                        { text: "Identify the main subject in this image. Describe it concisely, using three Chinese characters if possible. If not possible, provide a short English description (max 5 words)." },
                        {
                            inline_data: {
                                mime_type: "image/png", // Assuming PNG, might need flexibility (e.g., image/jpeg)
                                data: base64Data, // 🔹 使用提取的 Base64 數據
                            },
                        },
                    ],
                }
            ],
            // Optional: Add safety settings if needed
            // safetySettings: [
            //   { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
            // ],
            // generationConfig: { // Optional: Control output parameters
            //   maxOutputTokens: 50,
            //   temperature: 0.7,
            // }
        };
        console.log("[API /analyzeImage] 📡 Sending request to Google AI...");
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });

        console.log(`[API /analyzeImage] Received response status: ${response.status}`);
        const data = await response.json();

        if (!response.ok) {
            console.error("[API /analyzeImage] ❌ Google AI API Error Response:", data);
            const errorMsg = data?.error?.message || `Request failed with status ${response.status}`;
            // Send a more specific error if available
             return res.status(response.status).json({ error: `Google AI 服務請求失敗: ${errorMsg}` });
        }

        console.log("[API /analyzeImage] ✅ Google AI API Success Response:", JSON.stringify(data, null, 2)); // Log full response for debugging

        // Safer extraction of the text response
        let aiResponse = "無法識別"; // Default if no text found
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0 && data.candidates[0].content.parts[0].text) {
           aiResponse = data.candidates[0].content.parts[0].text.trim();
        } else if (data.promptFeedback?.blockReason) {
           // Handle cases where content was blocked by safety settings
           aiResponse = `內容被阻擋 (${data.promptFeedback.blockReason})`;
           console.warn(`[API /analyzeImage] ⚠️ AI response blocked: ${data.promptFeedback.blockReason}`);
        } else {
           console.warn("[API /analyzeImage] ⚠️ Could not extract text from AI response structure.");
        }

        // Update the global message
        lastMessage = aiResponse; // Store the full response for potential later use/display
        console.log(`[API /analyzeImage] ✨ New message stored from AI: "${lastMessage}"`);

        res.json({ result: lastMessage }); // Send the result back to the frontend

    } catch (error) {
        console.error("[API /analyzeImage] 💥 Exception during Google AI call:", error);
        res.status(500).json({ error: "調用 Google AI 時發生伺服器內部錯誤 (Internal server error during AI call)" });
    }
});



// --- 更新後的 /log-login 路由 ---
router.post("/log-login", async function (req, res) { // 改為 async
    const { userName } = req.body;

    // 1. 檢查 InfluxDB 是否可用
    if (!writeApi) {
        console.warn("[API /log-login] ⚠️ Log attempt skipped: InfluxDB is not configured or failed to initialize.");
        // 即使無法記錄，仍然讓登入繼續
        return res.status(200).json({ status: "warning", message: "Login successful, but event not logged (DB unavailable)" });
    }

    // 2. 檢查 userName
    if (!userName || typeof userName !== 'string' || userName.trim() === '') {
        console.error("[API /log-login] ❌ Log attempt failed: userName is missing or invalid.");
        return res.status(400).json({ status: "error", message: "Valid userName is required" });
    }

    const trimmedUserName = userName.trim();
    console.log(`[API /log-login] Received login attempt for user: ${trimmedUserName}`);

    // 3. 建立資料點
    const point = new Point('login_events') // Measurement 名稱
      .tag('source', 'webapp')            // Tag
      .stringField('user_name', trimmedUserName) // Field
      .timestamp(new Date());             // 時間戳

    // 4. 嘗試寫入並 Flush
    try {
        console.log(`[API /log-login] Attempting to write point to InfluxDB bucket: ${influxBucket} for user: ${trimmedUserName}`);
        writeApi.writePoint(point); // 將點放入寫入緩衝區

        console.log(`[API /log-login] Point added to buffer for user: ${trimmedUserName}. Attempting to flush...`);
        await writeApi.flush(); // 強制將緩衝區的數據發送到 InfluxDB

        console.log(`[API /log-login] ✅ InfluxDB write flushed successfully for user: ${trimmedUserName}.`);
        res.json({ status: "success", message: "Login event logged" });

    } catch (error) {
        console.error(`\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
        console.error(`[API /log-login] 💥 CATCH BLOCK: Error writing/flushing login event for user ${trimmedUserName} to InfluxDB:`);
        console.error(`Error Message: ${error?.message || 'Unknown error during write/flush'}`);
        // Log InfluxDB client error details if available (check influxdb-client documentation for specific error properties)
        if (error?.body) { // Example property, might differ
             console.error(`InfluxDB Error Body: ${error.body}`);
        } else if (error?.response?.data) { // From Axios-like errors
             console.error(`InfluxDB Response Data: ${error.response.data}`);
        }
        console.error(`Stack Trace: ${error?.stack || 'No stack trace available'}`);
        console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n`);
        // 返回伺服器錯誤
        res.status(500).json({ status: "error", message: "Failed to log login event due to DB error", errorDetails: error.message });
    }
});
// ------------------------------------

// 優雅關閉 InfluxDB 連接
function closeInfluxDB() {
    console.log('[Shutdown] Attempting to close InfluxDB write API...');
    if (writeApi) {
        return writeApi.close()
            .then(() => {
                console.log('[Shutdown] ✅ InfluxDB write API closed successfully.');
            })
            .catch(e => {
                console.error('[Shutdown] 💥 Error closing InfluxDB write API:', e);
            });
    } else {
        console.log('[Shutdown] InfluxDB write API was not initialized, nothing to close.');
        return Promise.resolve(); // Return a resolved promise
    }
}

// Handle graceful shutdown signals
process.on('SIGTERM', () => {
  console.log('[Shutdown] SIGTERM signal received. Closing InfluxDB connection...');
  closeInfluxDB().finally(() => {
      console.log('[Shutdown] Exiting process after SIGTERM.');
      process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Shutdown] SIGINT signal received (Ctrl+C). Closing InfluxDB connection...');
  closeInfluxDB().finally(() => {
      console.log('[Shutdown] Exiting process after SIGINT.');
      process.exit(0); // Exit after cleanup
    });
});

module.exports = router;

// --- END OF FILE api.js ---