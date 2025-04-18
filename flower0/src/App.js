// --- START OF FILE App.js ---

import './App.css';
import React, { useState, useEffect, useRef } from "react"; // ✅ 引入 useEffect 和 useRef
import Webcam from "react-webcam";
import { useNavigate, useLocation } from "react-router-dom"; // ✅ 引入 useNavigate 和 useLocation
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";

function App() {
  // ----- 既有狀態 -----
  const [input, setInput] = useState(""); // 這個 state 似乎沒用到？可以考慮移除
  const [response, setResponse] = useState("正在載入最新訊息..."); // AI 的主要回應內容，給個初始載入提示
  const [loading, setLoading] = useState(false); // 控制「辨識花種」按鈕的載入狀態
  const [image, setImage] = useState(null); // 儲存擷取或上傳的圖片 Base64
  // const [result, setResult] = useState(""); // 這個狀態可能可以被 popup 取代，但我們先保留
  const [showPopup, setShowPopup] = useState(false); // 控制彈出視窗顯示
  const [popupMessage, setPopupMessage] = useState(""); // 彈出視窗訊息
  const [popupType, setPopupType] = useState(""); // 彈出視窗類型 "success" or "fail"

  // ----- Hooks -----
  const webcamRef = useRef(null); // 給 Webcam 組件的參照
  const navigate = useNavigate(); // 導航用
  const location = useLocation(); // 獲取當前 URL 資訊
  const queryParams = new URLSearchParams(location.search);
  const targetFlower = queryParams.get("target") || ""; // 取得網址中的目標花名，加上預設值避免 null

  // ----- 常數 -----
  const REFRESH_INTERVAL = 5000; // 設定自動刷新的間隔時間 (5000ms = 5秒)

  // ========== 自動刷新 AI 回應的 useEffect ==========
  useEffect(() => {
    let intervalId = null; // 用來儲存 setInterval 回傳的 ID，以便清除

    // 定義一個異步函數來獲取最新的 AI 訊息
    const fetchLatestMessage = async () => {
      try {
        // 使用 GET 請求獲取後端儲存的最新訊息
        const apiResponse = await fetch(`${window.location.origin}/api/getResult`);

        if (!apiResponse.ok) {
          // 如果請求失敗，在控制台印出錯誤，但可能不需要打斷用戶操作或清空現有訊息
          console.error(`[Auto Refresh] 無法取得最新訊息，狀態碼: ${apiResponse.status}`);
          return; // 提前退出，不更新 state
        }

        const data = await apiResponse.json();

        // 確保後端真的有回傳 message 欄位，並且是字串
        if (data && typeof data.message === 'string') {
          // ✨ 優化：只有當後端訊息和目前顯示的訊息不同時才更新 state，避免不必要的重新渲染
          setResponse(currentResponse => {
            if (currentResponse !== data.message) {
              console.log('[Auto Refresh] 訊息已更新:', data.message);
              return data.message; // 回傳新訊息以更新 state
            }
            return currentResponse; // 訊息相同，不更新 state
          });
        } else {
             console.warn("[Auto Refresh] 後端回應格式不符或缺少 message 欄位:", data);
        }

      } catch (error) {
        console.error("[Auto Refresh] 獲取最新訊息時發生錯誤:", error);
        // 這裡可以考慮是否要顯示錯誤提示給用戶，但通常背景刷新失敗不需要打擾用戶
      }
    };

    // 1. 元件載入時，立刻執行一次 fetchLatestMessage 獲取初始訊息
    console.log('[Auto Refresh] 元件載入，立即獲取初始訊息...');
    fetchLatestMessage();

    // 2. 設定計時器，每隔 REFRESH_INTERVAL 毫秒就執行一次 fetchLatestMessage
    intervalId = setInterval(fetchLatestMessage, REFRESH_INTERVAL);
    console.log(`[Auto Refresh] 已設定每 ${REFRESH_INTERVAL / 1000} 秒自動刷新，Interval ID: ${intervalId}`);

    // 3. 清理函數：這個函數會在元件卸載 (unmount) 時執行
    return () => {
      if (intervalId) {
        clearInterval(intervalId); // 清除計時器，防止記憶體洩漏
        console.log(`[Auto Refresh] 元件卸載，清除 Interval ID: ${intervalId}`);
      }
    };

  }, []); // 空依賴陣列 [] 表示這個 effect 只在元件首次載入時執行一次設定，以及在卸載時執行一次清理

  // ========== 其他函數 (拍照、上傳、辨識) ==========

  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
          console.error("無法擷取圖片");
          setPopupMessage("❌ 擷取圖片失敗，請重試");
          setPopupType("fail");
          setShowPopup(true);
          return;
      }
      console.log("📸 圖片大小 (Base64 長度):", imageSrc.length);
      // 簡單的大小檢查 (Base64 字串長度大約是原始大小的 4/3)
      // 2MB * 4/3 ≈ 2.66M characters
      if (imageSrc.length > 2.7 * 1024 * 1024) {
        setPopupMessage("⚠️ 圖片可能過大 (超過 ~2MB)，建議使用較低解析度");
        setPopupType("fail"); // 也可以設為 "warning" 如果你有對應樣式
        setShowPopup(true);
        // 這裡可以選擇是否 return; 讓用戶決定是否繼續
      }
      setImage(imageSrc);
      // setResponse(""); // 拍照後不清空，讓自動刷新繼續顯示最新訊息
      // setResult(""); // 清空舊的成功/失敗結果
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 檔案大小檢查 (Client-side)
    if (file.size > 2 * 1024 * 1024) { // 2MB in bytes
        setPopupMessage("❌ 上傳的圖片超過 2MB 大小限制！");
        setPopupType("fail");
        setShowPopup(true);
        event.target.value = null; // 清空選擇，讓用戶可以重新選同一個檔名
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImage(reader.result);
      // setResponse(""); // 同上，不清空
      // setResult("");
    };
    reader.onerror = (error) => {
        console.error("讀取檔案錯誤:", error);
        setPopupMessage("❌ 讀取檔案時發生錯誤");
        setPopupType("fail");
        setShowPopup(true);
    }
  };

  const handleGenerate = async () => {
    if (!image) {
        setPopupMessage("❗️ 請先拍照或上傳圖片");
        setPopupType("fail");
        setShowPopup(true);
        return;
    }

    setLoading(true);
    // setResponse("辨識中..."); // 可以在這裡先給用戶一個提示

    try {
        // **重要**：調用後端的 /api/analyzeImage 來進行分析
        // 這個後端路由應該會處理 AI 分析，並 *更新* 它自己內部儲存的 `lastMessage`
        const analyzeResponse = await fetch(`${window.location.origin}/api/analyzeImage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image }), // 發送圖片 Base64
        });

        const data = await analyzeResponse.json();
        console.log("後端分析回應：", data);

        if (!analyzeResponse.ok) {
             // 如果後端回傳錯誤 (例如 4xx, 5xx 狀態碼)
             const errorMsg = data.error || `請求失敗，狀態碼 ${analyzeResponse.status}`;
             console.error("分析 API 錯誤:", errorMsg);
             setResponse(`辨識失敗: ${errorMsg}`); // 直接在主回應區顯示錯誤
             setPopupMessage(`❌ 辨識請求失敗: ${errorMsg}`);
             setPopupType("fail");
             setShowPopup(true);
        } else if (data.result) {
            // 分析成功，後端有回傳 result
            const aiResult = data.result.trim();
            setResponse(aiResult); // ✨ 立刻更新畫面上的回應，提供即時反饋

            const isCorrect = aiResult === targetFlower.trim();
            // setResult(isCorrect ? "辨識成功" : "辨識失敗"); // 更新成功/失敗狀態文字 (如果需要)

            // 設定彈出視窗
            setPopupMessage(isCorrect ? "🎉 辨識成功！" : `❌ 辨識失敗！(AI 結果: ${aiResult})`);
            setPopupType(isCorrect ? "success" : "fail");
            setShowPopup(true);

            // **不再需要** 手動 POST 到 /api/getResult
            // 因為 /api/analyzeImage 的後端邏輯應該已經更新了 lastMessage
            // 自動刷新機制 (useEffect) 會在下一次輪詢時自動抓取到這個新結果

        } else {
            // 後端請求成功，但沒有回傳 result
            setResponse("AI 無法提供辨識結果");
            setPopupMessage("❓ AI 沒有提供明確的回應");
            setPopupType("fail"); // 或者你可以設計一個中性的 popupType
            setShowPopup(true);
        }

    } catch (error) {
        // 處理 fetch 本身的錯誤 (例如網路問題)
        console.error("調用分析 API 時發生錯誤：", error);
        setResponse("客戶端錯誤，請檢查網路連線或稍後再試");
        setPopupMessage(`💥 請求失敗: ${error.message}`);
        setPopupType("fail");
        setShowPopup(true);
    } finally {
        // 無論成功或失敗，都要結束載入狀態
        setLoading(false);
    }
  };

  // ========== JSX 渲染 ==========
  return (
    <div className="App">

      {/* ✅ 彈出視窗區塊 */}
      {showPopup && (
          <div className={`popup ${popupType}`}>
            <div className="popup-content">
              <p>{popupMessage}</p>
              <button onClick={() => setShowPopup(false)}>關閉</button>
            </div>
          </div>
        )}

      {/* 📌 標題設計 */}
      <div className="title-bar">
        <h1 className="title">🌸 花間漫遊 <span className="highlight">AI</span></h1>
        {/* 可以考慮在這裡顯示目標花名 */}
        {targetFlower && <p className="target-flower-display">目標花種：{targetFlower}</p>}
      </div>

        {/* 相機視訊串流 */}
        <div className="webcam-container">
          <Webcam
            ref={webcamRef}
            audio={false} // 通常不需要聲音
            screenshotFormat="image/png"
            className="webcam"
            videoConstraints={{ facingMode: "environment" }} // 優先使用後置鏡頭
            mirrored={false} // 後置鏡頭通常不需要鏡像
          />
          <div className="button-container">
            <button className="back-btn" title="返回主頁" onClick={() => navigate("/main")}>🔙</button>
            <button className="icon-btn capture-btn" title="拍照" onClick={capturePhoto}><FontAwesomeIcon icon={faCamera} size="2x" /></button>
            {/* 下載按鈕：只有在有圖片時才顯示且可點擊 */}
            <button
                className="icon-btn download-btn"
                title="下載圖片"
                onClick={() => {
                    const link = document.createElement("a");
                    link.href = image;
                    link.download = `flower-capture-${Date.now()}.png`; // 加上時間戳避免檔名重複
                    link.click();
                }}
                disabled={!image} // 沒有圖片時禁用
            >
              ⬇️
            </button>
          </div>
       </div>

        {/* 上傳檔案區塊 */}
        <div className="upload-section">
            <label htmlFor="file-upload" className="custom-file-upload">
                選擇檔案
            </label>
            <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} />
            <span className="upload-hint">* 或點此上傳圖片 (建議 2MB 以下)</span>
        </div>


        {/* 顯示預覽圖和辨識按鈕 */}
        <div className="preview-and-action">
            {image && (
              <div className="image-preview-container">
                <p className="preview-title">預覽：</p>
                <img src={image} alt="Uploaded or Captured" className="image-preview" />
              </div>
            )}

            <button className="analyze-btn" onClick={handleGenerate} disabled={loading || !image}>
              {loading ? "辨識中..." : "辨識花種"}
            </button>
        </div>


        {/* 📌 AI 回應區塊 - 直接顯示 response state */}
        <div className="ai-response">
            <p className="response-label">AI 回應:</p>
            {/* 這裡顯示的是由自動刷新或手動辨識更新的 response state */}
            <p className="response-text">{response}</p>

            {/* 可以移除 result state 相關的顯示，因為主要訊息在 response，成功失敗在 popup */}
            {/* <p className="result-text" style={{ fontWeight: "bold", color: result.includes("成功") ? "green" : "red" }}>
              {result}
            </p> */}
        </div>

    </div>
  );
}

export default App;

// --- END OF FILE App.js ---