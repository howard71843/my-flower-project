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


// 建立 InfluxDB Client
const influxDB = new InfluxDB({ url: influxUrl, token: influxToken });
// 建立 Write API
const writeApi = influxDB.getWriteApi(influxOrg, influxBucket);
console.log(`InfluxDB write API configured for bucket: ${influxBucket}`);
// -----------------------------


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
router.post("/log-login", function (req, res) {
    const { userName } = req.body;

    if (!userName) {
        console.error("Log-login attempt failed: userName is missing.");
        return res.status(400).json({ status: "error", message: "userName is required" });
    }

    console.log(`Received login attempt for user: ${userName}`);

    // 建立 InfluxDB 資料點 (Point)
    const point = new Point('login_events') // 'login_events' 是 measurement 的名稱
      .tag('source', 'webapp') // 可以添加 tag 來分類資料，例如來源是 webapp
      .stringField('user_name', userName) // 將使用者名稱儲存為 string field
      .timestamp(new Date()); // InfluxDB 會自動加上時間戳，但也可以手動指定

    try {
        // 將資料點寫入 InfluxDB
        writeApi.writePoint(point);
        // 確保資料被送出 (非必要，但對於立即關閉的腳本或 lambda 可能有用)
        // writeApi.flush().then(() => { console.log('InfluxDB write flushed.'); });
        console.log(`Logged login event for user: ${userName} to InfluxDB bucket: ${influxBucket}`);
        res.json({ status: "success", message: "Login event logged" });
    } catch (error) {
        console.error("Error writing to InfluxDB:", error);
        // 即使記錄失敗，也可能希望登入繼續，所以不一定返回 500
        // 這裡只在伺服器端記錄錯誤，並返回成功給前端 (或者可以選擇返回錯誤)
        res.status(500).json({ status: "error", message: "Failed to log login event" });
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
