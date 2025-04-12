var express = require("express");
var router = express.Router();
const { InfluxDB, Point } = require('@influxdata/influxdb-client'); // 引入 InfluxDB 客戶端


const API_KEY = "AIzaSyBwqv30_RB4M3cd3C7aAUyDf0PcDb8_R_U  "; // 請替換成你的 API Key    AIzaSyBqFkyEWwQj3bO3DCLLi2to_t_AFOd3Y-U
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
                        { text: "回答什麼花就好？精簡化句點也不要" }, // Google AI 提問
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


// ✅ 新增登入紀錄：寫入 InfluxDB Cloud
router.post("/log-login", async (req, res) => {
    const influxUrl = process.env.INFLUX_URL;
    const influxToken = process.env.INFLUX_TOKEN;
    const influxOrg = process.env.INFLUX_ORG;
    const influxBucket = process.env.INFLUX_BUCKET;

    if (!influxUrl || !influxToken || !influxOrg || !influxBucket) {
        console.error('❌ 缺少 InfluxDB 設定，請確認 .env 已設定');
        return res.status(500).send('後端環境變數未正確設置');
    }

    const influxDB = new InfluxDB({ url: influxUrl, token: influxToken });
    const writeApi = influxDB.getWriteApi(influxOrg, influxBucket, 'ns');

    const { userName } = req.body;
    if (!userName || typeof userName !== 'string' || userName.trim() === '') {
        return res.status(400).send('請提供有效的使用者名稱');
    }

    const trimmedUserName = userName.trim();
    const point = new Point('user_logins')
        .tag('action', 'login')
        .tag('source', 'web_app')
        .stringField('user_name', trimmedUserName)
        .timestamp(new Date());

    try {
        writeApi.writePoint(point);
        await writeApi.flush();
        console.log(`✅ 已寫入 InfluxDB 登入紀錄：${trimmedUserName}`);
        res.status(200).send('登入紀錄成功');
    } catch (error) {
        console.error('❌ 寫入 InfluxDB 失敗：', error);
        res.status(500).send('寫入登入紀錄失敗');
    }
});


router.get('/login-history', async (req, res) => {
    try {
      const influxDB = new InfluxDB({
        url: process.env.INFLUX_URL,
        token: process.env.INFLUX_TOKEN,
      });
  
      const queryApi = influxDB.getQueryApi(process.env.INFLUX_ORG);
      const fluxQuery = `
        from(bucket: "${process.env.INFLUX_BUCKET}")
          |> range(start: -1h)
          |> filter(fn: (r) => r._measurement == "user_logins")
          |> sort(columns: ["_time"], desc: true)
      `;
  
      const rows = await queryApi.collectRows(fluxQuery); // ✅ 回傳 array
      res.json(rows); // ✅ 回傳結果陣列給前端
    } catch (err) {
      console.error('❌ 查詢錯誤：', err);
      res.status(500).json({ error: '系統錯誤', detail: err.message });
    }
  });
  
  

module.exports = router;
