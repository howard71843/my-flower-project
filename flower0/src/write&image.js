import logo from './logo.svg';
import './App.css';
import { useState } from "react";

function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);

  const API_KEY = "AIzaSyBwqv30_RB4M3cd3C7aAUyDf0PcDb8_R_U"; // 請替換成你的 API Key
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${API_KEY}`;


  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImage(reader.result);
    };
  };



  const handleGenerate = async () => {
    if (!input.trim() && !image) return;
    
    setLoading(true); // 顯示 Loading 狀態
    setResponse(""); // 清空上次回應

   /* try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: input + "，請詳細解釋。" }] }]
        }),
      });

      const data = await response.json();
      console.log("API Response:", data); // 🔍 確保 API 回應有內容
      console.log("Candidates:", data.candidates);
      const aiResponse = data.candidates?.length > 0
      ? data.candidates[0]?.content?.parts?.[0]?.text
      : "No response from AI";

      setResponse(aiResponse);
    } catch (error) {
      console.error("Error:", error);
      let errorMessage = "Unknown error";
      if (error.response) {
        errorMessage = await error.response.text();
      }
      console.error("Error Details:", errorMessage);
      setResponse("Error fetching response: " + errorMessage);
    } finally {
      setLoading(false); // 結束 Loading
    }*/

      try {
        const requestBody = {
          contents: [
            {
              parts: []
            }
          ]
        };
  
        if (input.trim()) {
          requestBody.contents[0].parts.push({ text: input });
        }
  
        if (image) {
          requestBody.contents[0].parts.push({
            inline_data: {
              mime_type: "image/png",
              data: image.split(",")[1]
            }
          });
        }
  
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
  
        const data = await response.json();
        console.log("API Response:", data);
  
        const aiResponse = data.candidates?.length > 0
          ? data.candidates[0]?.content?.parts?.[0]?.text
          : "No response from AI";
  
        setResponse(aiResponse);
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
        <h1>Google Gemini API 圖片輸入</h1>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="輸入你的問題..."
          rows="3"
          style={{ width: "80%", padding: "10px", fontSize: "16px" }}
        />
         <input type="file" accept="image/*" onChange={handleImageUpload} />

          {image && (
            <div>
              <p>上傳的圖片：</p>
              <img src={image} alt="Uploaded" style={{ maxWidth: "300px", borderRadius: "5px" }} />
            </div>
          )}
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? "請稍候..." : "送出"}
        </button>
        <p><strong>AI 回應：</strong></p>
        <div style={{ whiteSpace: "pre-line", textAlign: "left", padding: "10px" , borderRadius: "5px" }}>
          {response}
        </div>
      </header>
    </div>
  );
}

export default App;
