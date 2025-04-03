import logo from './logo.svg';
import './App.css';
import { useState } from "react";
import Webcam from "react-webcam";
import React from "react";



function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(""); // 判斷成功與否的狀態
  const webcamRef = React.useRef(null);


  const API_KEY = "AIzaSyBwqv30_RB4M3cd3C7aAUyDf0PcDb8_R_U"; // 請替換成你的 API Key
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${API_KEY}`;


  const capturePhoto = () => { 
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImage(imageSrc);
      setResponse("");
      setResult("");
    }
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
    if (!input.trim() && !image) return;
    
    setLoading(true); // 顯示 Loading 狀態
    setResponse(""); // 清空上次回應

   

      try {
        const requestBody = {
          contents: [
            {
              parts: [
                { text: "這是什麼？請用三個字回答。" }, // 預設的提問文字
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: image.split(",")[1], // 移除 Base64 頭部
                  },
                },
              ],
            }
          ]
        };
  
  
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
  
        const data = await response.json();
        console.log("API Response:", data);
  
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "無回應";
        setResponse(aiResponse.slice(0, 3)); // 確保只顯示三個字
        // 判斷是否是 "九重葛"
      if (aiResponse.slice(0, 3) === "九重葛") {
        setResult("✅ 成功");
        
      } else {
        setResult("❌ 不是九重葛"); 
        
      }
      } catch (error) {
        console.error("Error:", error);
        setResponse("Error fetching response.");
      } finally {
        setLoading(false);
      }
    
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>圖片識別 AI</h1>

        {/* 相機視訊串流 */}
        <Webcam ref={webcamRef} screenshotFormat="image/png" width={300} height={200} />
        <button onClick={capturePhoto}>📷 拍照</button>

        <input type="file" accept="image/*" onChange={handleImageUpload} />

        {image && (
          <div>
            <p>上傳的圖片：</p>
            <img src={image} alt="Uploaded" style={{ maxWidth: "300px", borderRadius: "5px" }} />
          </div>
        )}

        <button onClick={handleGenerate} disabled={loading || !image}>
          {loading ? "請稍候..." : "分析圖片"}
        </button>

        <p><strong>AI 回應：</strong></p>
        <div style={{ whiteSpace: "pre-line", textAlign: "left", padding: "10px",  borderRadius: "5px" }}>
          {response}
        </div>
         {/* 判斷結果 */}
         {result && (
          <p style={{ fontSize: "20px", fontWeight: "bold", marginTop: "10px" }}>
            {result}
          </p>
        )}
      </header>
    </div>
  );
}

export default App;
