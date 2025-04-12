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

if (!influxToken || influxToken === '5OHSyb94Xs86DA98VW62dpVglh75g3iqmGDoQDKriQHf--vk0EgxofSuh-MBAZ75qQNMebv7yp-ko-ROb1Q2DA==' || !influxOrg || !influxBucket || !influxUrl) {
    console.error("FATAL ERROR: InfluxDB environment variables are not properly configured.");
    // Optionally, you could prevent the app from starting fully or disable Influx writing
}

// 建立 InfluxDB Client
const influxDB = new InfluxDB({ url: influxUrl, token: influxToken });
// 建立 Write API
const writeApi = influxDB.getWriteApi(influxOrg, influxBucket);
console.log(`InfluxDB write API configured for bucket: ${influxBucket}`);




const API_KEY = "AIzaSyBwqv30_RB4M3cd3C7aAUyDf0PcDb8_R_U"; // 請替換成你的 API Key
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
                        { text: "這是什麼？請用三個字回答。" }, // Google AI 提問
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



// --- 新增：記錄登入事件到 InfluxDB ---
router.post("/log-login", async function (req, res) { // Make async for potential flush
    const { userName } = req.body;

    if (!userName) {
        console.error("Log-login attempt failed: userName is missing.");
        return res.status(400).json({ status: "error", message: "userName is required" });
    }

    console.log(`Received login attempt for user: ${userName}`);

    const point = new Point('login_events')
      .tag('source', 'webapp')
      .stringField('user_name', userName)
      .timestamp(new Date());

    try {
        console.log(`Attempting to write point to InfluxDB bucket: ${influxBucket}`); // Add log before write
        writeApi.writePoint(point);
        console.log(`Point supposedly written for user: ${userName}. Attempting to flush...`); // Add log after write

        // Try explicitly flushing the write buffer
        await writeApi.flush();
        console.log(`InfluxDB write flushed for user: ${userName}.`); // Add log after flush

        // This log message might be misleading if flush fails silently or write fails later
        // console.log(`Logged login event for user: ${userName} to InfluxDB bucket: ${influxBucket}`);
        res.json({ status: "success", message: "Login event logged and flushed" });

    } catch (error) {
        // Log the *full* error object to see details
        console.error("!!! Error writing or flushing to InfluxDB:", error);
        // Send a more specific error response
        res.status(500).json({ status: "error", message: "Failed to write login event to DB", errorDetails: error.message });
    }
});

// 同時，在應用程式關閉時，優雅地關閉 InfluxDB 連接
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing InfluxDB write API.');
    writeApi
      .close()
      .then(() => {
        console.log('InfluxDB write API closed.');
        process.exit(0);
      })
      .catch(e => {
        console.error('Error closing InfluxDB write API', e);
        process.exit(1);
      });
  });
  


module.exports = router;
