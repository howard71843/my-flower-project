
import './App.css';
import { useState } from "react";
import Webcam from "react-webcam";
import React from "react";
import { useNavigate } from "react-router-dom"; // ✅ 引入 useNavigate
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"; // 引入 FontAwesomeIcon 放相機icon
import { faCamera } from "@fortawesome/free-solid-svg-icons";    // 引入相機圖示



function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(""); // 判斷成功與否的狀態
  const webcamRef = React.useRef(null);
  const navigate = useNavigate(); // ✅ 初始化 useNavigate()
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const targetFlower = queryParams.get("target"); // 取得網址中的目標花名
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState(""); // "success" or "fail"
  





  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      console.log("📸 圖片大小 (Base64 長度):", imageSrc.length);
      if (imageSrc.length > 2 * 1024 * 1024) {  // 2MB 限制
        alert("圖片過大，請選擇較小的解析度或壓縮圖片");
        return;
    }
      setImage(imageSrc);
      setResponse("");
      setResult("");
    }
  };

  const handleDownloadOrShare = async () => {
    if (!image) {
      alert("尚未拍照或上傳圖片！");
      return;
    }
  
    const link = document.createElement("a");
    link.href = image;  // 這是 base64 圖片
    link.download = "captured_photo.png"; // 下載檔名可自訂
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImage(reader.result);
      setResponse(""); // 清空回應
      setResult(""); // 清空判斷結果
    };
  };



  const handleGenerate = async () => {
    if (!image) return;
    
    setLoading(true);
    setResponse("");

    try {
        const response = await fetch(`${window.location.origin}/api/analyzeImage`, { // 根據當前網址決定呼叫位置  而本地"http://localhost:3000/api/analyzeImage"
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image }),
        });

        const data = await response.json();
        console.log("後端回應：", data);

        if (data.result) {
            setResponse(data.result);
            const isCorrect = data.result.trim() === targetFlower.trim();

           
          setPopupMessage(isCorrect ? "🎉 辨識成功！" : "❌ 辨識失敗！");
          setPopupType(isCorrect ? "success" : "fail");
          setShowPopup(true);

            // 🔹 存入後端
            await fetch(`${window.location.origin}/api/getResult`, {  // 根據當前網址決定呼叫位置  而本地"http://localhost:3000/api/getResult"
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: data.result, target: targetFlower }),
            });
        } else {
            setResponse("無回應");
        }

    } catch (error) {
        console.error("錯誤：", error);
        setResponse("錯誤，請稍後再試");
    } finally {
        setLoading(false);
    }
};


  return (
    
    <div className="App">


    {/* ✅ 彈出視窗區塊，放在最上方 */}
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
      </div>

        {/* 相機視訊串流 */}
        <div className="webcam-container">
          <Webcam ref={webcamRef} screenshotFormat="image/png" className="webcam"   videoConstraints={{ facingMode: "environment",}} />   
          <div className="button-container">  
            <button className="back-btn" onClick={() => navigate("/main")}>🔙 </button>
            <button className="icon-btn" onClick={capturePhoto}><FontAwesomeIcon icon={faCamera} size="2x" /></button>
            <button className="icon-btn" onClick={handleDownloadOrShare} > ⬇️ </button>
          </div>
       </div>

         上傳檔案 <input type="file" accept="image/*" onChange={handleImageUpload} />*

        {image && (
          <div>
            <p></p>
            <img src={image} alt="Uploaded" style={{ maxWidth: "300px", borderRadius: "5px" }} />
          </div>
        )}

        <button onClick={handleGenerate} disabled={loading || !image}>
          {loading ? "請稍候..." : "辨識花種"}
        </button>

        

        {/* 📌 AI 回應區塊 */}
      <div className="ai-response">
        <p className="response-text">{response || "請上傳圖片來獲取 AI 回應"}</p>
        <p className="result-text" style={{ fontWeight: "bold", color: result.includes("成功") ? "green" : "red" }}>
          {result}
        </p>
      </div>
    </div>
  );
}

export default App;
