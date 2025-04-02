var express = require("express");
var router = express.Router();


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

module.exports = router;
