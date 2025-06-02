var express = require("express");
var router = express.Router();
const { InfluxDB, Point } = require('@influxdata/influxdb-client'); // 引入 InfluxDB client



// --- InfluxDB Configuration ---
// **重要**: 使用環境變數儲存敏感資訊，特別是在 Render 上部署時
// 在 Render 的 Environment Variables 中設定這些值
const influxUrl = process.env.INFLUXDB_URL || 'https://us-east-1-1.aws.cloud2.influxdata.com'; // 替換為你的 InfluxDB URL 或在環境變數中設定
const influxToken = process.env.INFLUXDB_TOKEN || '5OHSyb94Xs86DA98VW62dpVglh75g3iqmGDoQDKriQHf--vk0EgxofSuh-MBAZ75qQNMebv7yp-ko-ROb1Q2DA=='; // **必須** 在環境變數中設定你的 Token
const influxOrg = process.env.INFLUXDB_ORG || 'Flower'; // 替換為你的 InfluxDB Org 或在環境變數中設定
const influxBucket = process.env.INFLUXDB_BUCKET || 'login_logs'; // 替換為你的 InfluxDB Bucket 或在環境變數中設定

// +++ Add Logging Here +++
console.log("--- InfluxDB Configuration Check ---");
console.log("InfluxDB URL:", influxUrl);
console.log("InfluxDB Org:", influxOrg);
console.log("InfluxDB Bucket:", influxBucket);
// **NEVER log the full token in production logs**
console.log("InfluxDB Token Loaded:", influxToken ? `Yes (Length: ${influxToken.length})` : "No");
console.log("------------------------------------");
// ++++++++++++++++++++++++
let writeApi; // 將 writeApi 宣告在外面，以便全局檢查

if (!influxUrl || !influxToken || !influxOrg || !influxBucket) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("FATAL: InfluxDB environment variables are missing or incomplete.");
    console.error("Please check INFLUXDB_URL, INFLUXDB_TOKEN, INFLUXDB_ORG, INFLUXDB_BUCKET in Render.");
    console.error("InfluxDB logging will be disabled.");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    // 在這種情況下，可以選擇讓應用程式崩潰或禁用相關功能
    // writeApi = null; // 標記 writeApi 為不可用
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




const API_KEY = "AIzaSyABwxctKoCGlV07ebSwRqMM3RyrcUp3feA"; // 請替換成你的 API Key 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${API_KEY}`;

let lastMessage = ""; // 儲存最新 AI 訊息

//儲存 AI 訊息（POST 請求）
router.post("/setResult", function (req, res) {
    lastMessage = req.body.message;
    console.log("後端儲存的訊息：", lastMessage);
    res.json({ status: "success" });
});


// 取得 AI 訊息（GET 請求）
router.get("/getResult", function (req, res) {
    res.json({ message: lastMessage });
});

// 🔹 調用 Google AI Studio 來分析圖片
router.post("/analyzeImage", async function (req, res) {
    const { image } = req.body; // 🔹 從前端獲取 base64 圖片
    console.log("📸 收到圖片數據：", image ? "✅ 已接收" : "❌ 未接收到圖片");
    if (!image) {
        return res.status(400).json({ error: "請提供圖片" });
    }

    try {
        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: "這是什麼？回答花種即可不用標點符號。" }, // Google AI 提問
                        {
                            inline_data: {
                                mime_type: "image/png",
                                data: image.split(",")[1], // 🔹 移除 Base64 頭部
                            },
                        },
                    ],
                }
            ]
        };
        console.log("📡 傳送到 Google AI Studio API...");
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log("Google AI Studio API 回應：", data);

        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "無回應";
        lastMessage = aiResponse.slice(0, 100); // 只顯示三個字

        res.json({ result: lastMessage });

    } catch (error) {
        console.error("Google AI Studio API 錯誤：", error);
        res.status(500).json({ error: "Google AI 服務請求失敗" });
    }
});



// --- 更新後的 /log-login 路由 ---
router.post("/log-login", async function (req, res) { // 改為 async
    const { userName } = req.body;

    // 1. 檢查 InfluxDB 是否可用
    if (!writeApi) {
        console.warn("Log-login attempt skipped: InfluxDB is not configured or failed to initialize.");
        // 即使無法記錄，仍然讓登入繼續？取決於你的需求
        // 如果必須記錄，可以返回錯誤：
        // return res.status(503).json({ status: "error", message: "Logging service unavailable" });
        // 此處選擇僅警告並繼續：
        return res.status(200).json({ status: "warning", message: "Login successful, but event not logged (DB unavailable)" });
    }

    // 2. 檢查 userName
    if (!userName || typeof userName !== 'string' || userName.trim() === '') {
        console.error("Log-login attempt failed: userName is missing or invalid.");
        return res.status(400).json({ status: "error", message: "Valid userName is required" });
    }

    const trimmedUserName = userName.trim();
    console.log(`Received login attempt for user: ${trimmedUserName}`);

    // 3. 建立資料點
    const point = new Point('login_events') // Measurement 名稱 (與 InfluxDB Bucket 中的結構對應)
      .tag('source', 'webapp')            // Tag (用於過濾和索引)
      .stringField('user_name', trimmedUserName) // Field (實際的數據值)
      .timestamp(new Date());             // 時間戳 (通常自動產生，也可手動指定)

    // 4. 嘗試寫入並 Flush
    try {
        console.log(`Attempting to write point to InfluxDB bucket: ${influxBucket} for user: ${trimmedUserName}`);
        writeApi.writePoint(point); // 將點放入寫入緩衝區

        console.log(`Point added to buffer for user: ${trimmedUserName}. Attempting to flush...`);
        await writeApi.flush(); // 強制將緩衝區的數據發送到 InfluxDB

        console.log(`✅ InfluxDB write flushed successfully for user: ${trimmedUserName}.`);
        res.json({ status: "success", message: "Login event logged" });

    } catch (error) {
        console.error(`\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
        console.error(`API HANDLER CATCH BLOCK: Error writing or flushing login event for user ${trimmedUserName} to InfluxDB:`);
        console.error(`Error Message: ${error?.message || 'Unknown error during write/flush'}`);
        if (error?.response?.data) {
             console.error(`InfluxDB Response Data: ${error.response.data}`);
        }
        console.error(`Stack Trace: ${error?.stack || 'No stack trace available'}`);
        console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n`);
        // 返回伺服器錯誤，但包含一些資訊
        res.status(500).json({ status: "error", message: "Failed to log login event due to DB error", errorDetails: error.message });
    }
});
// ------------------------------------

// 優雅關閉 InfluxDB 連接
function closeInfluxDB() {
    console.log('Attempting to close InfluxDB write API...');
    if (writeApi) {
        return writeApi.close()
            .then(() => {
                console.log('InfluxDB write API closed successfully.');
            })
            .catch(e => {
                console.error('Error closing InfluxDB write API:', e);
            });
    } else {
        console.log('InfluxDB write API was not initialized, nothing to close.');
        return Promise.resolve(); // 返回一個已解決的 Promise
    }
}

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing InfluxDB connection...');
  closeInfluxDB().finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received (Ctrl+C). Closing InfluxDB connection...');
  closeInfluxDB().finally(() => process.exit(0));
});
  


module.exports = router;
