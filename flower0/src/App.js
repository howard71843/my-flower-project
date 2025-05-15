import './App.css';
import { useState, useRef, useCallback } from "react"; // Added useRef, useCallback
import Webcam from "react-webcam";
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faFileUpload, faHome, faRedo, faDownload } from "@fortawesome/free-solid-svg-icons"; // Added more icons

async function base64ToBlob(base64Data) {
  const response = await fetch(base64Data);
  if (!response.ok) {
    throw new Error(`Failed to fetch base64 data for blob conversion: ${response.statusText}`);
  }
  return response.blob();
}

function App() {
  // const [input, setInput] = useState(""); // Not used
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null); // This is KEY for switching UI modes
  // const [result, setResult] = useState(""); // result is now mainly in popupMessage
  const webcamRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const targetFlower = queryParams.get("target");
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("");

  const fileInputRef = useRef(null); // For triggering file upload

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot({ type: "image/png" });
      if (!imageSrc) {
        console.error("Failed to capture photo from webcam.");
        alert("拍照失敗，請重試。");
        return;
      }
      if (imageSrc.length > 3 * 1024 * 1024) {
        alert("圖片過大，請選擇較小的解析度或壓縮圖片");
        return;
      }
      setImage(imageSrc);
      setResponse("");
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
    const defaultFilenameForDownload = `花間漫遊_${targetFlower || '照片'}.png`;

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
          await navigator.share({
            files: [imageFile],
            title: targetFlower ? `我拍到的${targetFlower}!` : "我拍的照片!",
            text: targetFlower ? `快來看看我用「花間漫遊AI」拍到的${targetFlower}!` : "快來看看我用「花間漫遊AI」拍到的美麗照片!",
          });
          console.log("圖片分享成功！");
          return;
        } catch (error) {
          console.error("分享失敗：", error);
          if (error.name === 'AbortError') return;
          alert("分享失敗，將嘗試下載圖片。");
        }
      } else {
        alert("此瀏覽器不支援分享此類型的檔案，將嘗試下載圖片。");
      }
    } else {
      alert("您的瀏覽器不支援分享功能，將嘗試下載圖片。");
    }
    triggerDownload(image, defaultFilenameForDownload);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImage(reader.result);
      setResponse("");
    };
    if (fileInputRef.current) { // Reset file input
        fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!image) return;
    setLoading(true);
    setResponse("");
    try {
      const apiResponse = await fetch(`${window.location.origin}/api/analyzeImage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await apiResponse.json();
      if (data.result) {
        setResponse(data.result);
        const isCorrect = data.result.trim() === targetFlower?.trim();
        setPopupMessage(isCorrect ? `🎉 辨識成功！是 ${data.result}` : `❌ 辨識失敗！AI 認為是 ${data.result}`);
        setPopupType(isCorrect ? "success" : "fail");
        setShowPopup(true);
        await fetch(`${window.location.origin}/api/getResult`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: data.result, target: targetFlower }),
        });
      } else {
        setResponse(data.error || "無回應或辨識出錯");
        setPopupMessage(data.error || "辨識時發生錯誤，請稍後再試。");
        setPopupType("fail");
        setShowPopup(true);
      }
    } catch (error) {
      console.error("錯誤：", error);
      setResponse("錯誤，請稍後再試");
      setPopupMessage("連線或處理錯誤，請稍後再試。");
      setPopupType("fail");
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setImage(null);
    setResponse("");
  };

  return (
    <div className="App">
      {showPopup && (
        <div className={`popup ${popupType}`}>
          <div className="popup-content">
            <p>{popupMessage}</p>
            <button onClick={() => setShowPopup(false)}>關閉</button>
          </div>
        </div>
      )}

      <div className="title-bar-overlay">
        <button className="overlay-nav-btn" onClick={() => navigate("/main")}>
          <FontAwesomeIcon icon={faHome} />
        </button>
        <h1 className="title">🌸 花間漫遊 <span className="highlight">AI</span></h1>
         {/* Placeholder for right side if needed */}
        <div style={{width: "40px"}}></div>
      </div>

      {!image ? (
        // STATE 1: CAMERA VIEW (Maximized)
        <div className="camera-mode-container">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/png"
            className="webcam-maximized"
            videoConstraints={{ facingMode: "environment" }}
            audio={false}
          />
          <div className="controls-overlay-bottom">
            <button className="overlay-action-btn" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
              <FontAwesomeIcon icon={faFileUpload} size="lg" />
            </button>
            <input
              id="file-upload-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <button className="overlay-action-btn capture-btn-main" onClick={capturePhoto}>
              <FontAwesomeIcon icon={faCamera} size="2x" />
            </button>
            {/* Placeholder for symmetry or another button */}
            <div style={{width: "50px", height: "50px"}}></div>
          </div>
        </div>
      ) : (
        // STATE 2: PREVIEW AND ANALYSIS MODE
        <div className="preview-mode-container">
          <div className="preview-top-controls">
            <button className="preview-control-btn" onClick={handleRetake}>
              <FontAwesomeIcon icon={faRedo} /> 重拍
            </button>
            <button className="preview-control-btn" onClick={handleDownloadOrShare} disabled={!image}>
              <FontAwesomeIcon icon={faDownload} /> 分享/下載
            </button>
          </div>

          <img src={image} alt="Captured or Uploaded" className="image-preview-maximized" />

          <button className="generate-btn-preview" onClick={handleGenerate} disabled={loading || !image}>
            {loading ? "辨識中..." : "辨識花種"}
          </button>

          {response && (
            <div className="ai-response-preview">
              <p className="response-text-preview">{response}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;