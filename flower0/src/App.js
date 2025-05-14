
import './App.css';
import { useState , useCallback } from "react";
import Webcam from "react-webcam";
import React from "react";
import { useNavigate } from "react-router-dom"; // ✅ 引入 useNavigate
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"; // 引入 FontAwesomeIcon 放相機icon
import { faCamera } from "@fortawesome/free-solid-svg-icons";    // 引入相機圖示



async function base64ToBlob(base64Data) {
  const response = await fetch(base64Data);
  if (!response.ok) {
    throw new Error(`Failed to fetch base64 data for blob conversion: ${response.statusText}`);
  }
  return response.blob();
}



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
  





  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot({ type: "image/png" }); // Ensure PNG
      if (!imageSrc) {
        console.error("Failed to capture photo from webcam.");
        alert("拍照失敗，請重試。");
        return;
      }
      console.log("📸 圖片大小 (Base64 長度):", imageSrc.length);
      // A more robust check for base64 size might be needed if exact byte size is critical
      // For now, length check is a proxy.
      if (imageSrc.length > 3 * 1024 * 1024) { // Approx 3MB for base64, actual file smaller
        alert("圖片過大，請選擇較小的解析度或壓縮圖片");
        return;
      }
      setImage(imageSrc);
      setResponse("");
      setResult("");
    }
  }, [webcamRef]);

  const triggerDownload = useCallback((imageSrc, downloadFilename) => {
    const link = document.createElement("a");
    link.href = imageSrc;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log("圖片下載完成。");
  }, []);

  const handleDownloadOrShare = async () => {
    if (!image) {
      alert("尚未拍照或上傳圖片！");
      return;
    }

    const defaultFilenameForDownload = "captured_photo.png";

    // Try to use Web Share API first
    if (navigator.share && navigator.canShare) {
      let blob;
      try {
        blob = await base64ToBlob(image);
      } catch (e) {
        console.error("將圖片轉換為 Blob 時發生錯誤:", e);
        alert("處理圖片時發生錯誤，將嘗試下載。");
        triggerDownload(image, defaultFilenameForDownload);
        return;
      }

      const fileExtension = blob.type.split('/')[1] || 'png';
      const shareFilename = `照片_${Date.now()}.${fileExtension}`;
      const imageFile = new File([blob], shareFilename, { type: blob.type });

      if (navigator.canShare({ files: [imageFile] })) {
        try {
          const shareData = {
            files: [imageFile],
            title: targetFlower ? `我拍到的${targetFlower}!` : "我拍的照片!",
            text: targetFlower ? `快來看看我用「花間漫遊AI」拍到的${targetFlower}!` : "快來看看我用「花間漫遊AI」拍到的美麗照片!",
          };
          await navigator.share(shareData);
          console.log("圖片分享成功！");
          return; // Shared successfully, no need to download
        } catch (error) {
          console.error("分享失敗：", error);
          if (error.name === 'AbortError') {
            console.log("使用者取消了分享。");
            // Optionally, you might not want to automatically download if the user explicitly cancelled.
            // For now, we return and do not proceed to download.
            return;
          }
          // For other errors during share, fall back to download
          alert("分享失敗，將嘗試下載圖片。");
        }
      } else {
        console.log("此檔案類型無法分享。將執行下載。");
        alert("此瀏覽器不支援分享此類型的檔案，將嘗試下載圖片。");
      }
    } else {
      console.log("Web Share API 不支援或此檔案無法分享。");
      alert("您的瀏覽器不支援分享功能，將嘗試下載圖片。");
    }

    // Fallback to download
    console.log("執行下載操作...");
    triggerDownload(image, defaultFilenameForDownload);
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
            <button className="back-btn" onClick={() => navigate("/main")}><span style={{ fontSize: "35px" }}>🔙</span></button>
            <button className="icon-btn" onClick={capturePhoto}><FontAwesomeIcon icon={faCamera} size="2x" /></button>
            <button className="icon-btn" onClick={handleDownloadOrShare} > <span style={{ fontSize: "35px" }}>⬇️</span> </button>
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
