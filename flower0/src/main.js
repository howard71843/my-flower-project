import React, { useState, useEffect } from "react"; 
import { useNavigate } from "react-router-dom";
import "./main.css"; 



// 🌸 花卉名稱與對應圖片
const flowerImages = {
    "九重葛": "/images/九重葛.jpg",
    "木棉花": "/images/木棉花.jpg",
    "桂花": "/images/桂花.jpg",
    "櫻花": "/images/櫻花.jpg",
    "油桐花": "/images/油桐花.jpg",
    "波斯菊": "/images/波斯菊.jpg",
    "牽牛花": "/images/牽牛花.jpg",
    "玫瑰花": "/images/玫瑰花.jpg",
    "金雞菊": "/images/金雞菊.jpg",
    "黃花風鈴木": "/images/黃花風鈴木.jpg"
};

// 🌸 **自訂每個花種的語音內容**
const customSpeechText = {
  "九重葛": "/audio/九重葛.mp3",
  "木棉花": "/audio/木棉花.mp3",
  "桂花": "/audio/桂花.mp3",
  "櫻花": "/audio/櫻花.mp3",
  "油桐花": "/audio/油桐花.mp3",
  "波斯菊": "/audio/波斯菊.mp3",
  "牽牛花": "/audio/牽牛花.mp3",
  "玫瑰花": "/audio/玫瑰花.mp3",
  "金雞菊": "/audio/金雞菊.mp3",
  "黃花風鈴木": "/audio/黃花風鈴木.mp3",
};

const Main = () => {
    // ✅ `unlockedImages` 初始值從 `localStorage` 讀取，避免 React 未即時更新
    const [unlockedImages, setUnlockedImages] = useState(() => {
        const storedUnlockedImages = localStorage.getItem("unlockedImages");
        return storedUnlockedImages ? JSON.parse(storedUnlockedImages) : {};
    });

    const [message, setMessage] = useState("");  
    const navigate = useNavigate();

    // ✅ 讀取後端 AI 辨識結果並解鎖圖片
    useEffect(() => {
        const fetchResult = async () => {
            try {
                const response = await fetch(`${window.location.origin}/api/getResult`);   // 根據當前網址決定呼叫位置  而本地"http://localhost:3000/api/getResult"
                const data = await response.json();
                console.log("🌐 從後端獲取的訊息：", data.message);
                const targetFlower = localStorage.getItem("targetFlower"); // 新增這行
                setMessage(data.message);

                if (data.message.trim() === targetFlower) {
                    setUnlockedImages(prevState => {
                        const updatedState = {
                            ...prevState,
                            [data.message.trim()]: true, // ✅ 只更新對應的圖片
                        };
                        console.log("🔄 更新解鎖狀態：", updatedState);

                        // ✅ 更新 localStorage
                        localStorage.setItem("unlockedImages", JSON.stringify(updatedState));
                        return updatedState;
                    });
                }
            } catch (error) {
                console.error("❌ 獲取 AI 訊息失敗：", error);
            }
        };

        fetchResult();
    }, []);

    // ✅ 監聽 `unlockedImages`，確保 `localStorage` 及 React 同步更新
    useEffect(() => {
        console.log("🔄 更新 localStorage，新的解鎖狀態：", unlockedImages);
        localStorage.setItem("unlockedImages", JSON.stringify(unlockedImages));
    }, [unlockedImages]);



      // ✅ 點擊花種名稱時播放語音
      const handleSpeak = (flowerName) => {
        const speechText = customSpeechText[flowerName] || `這是${flowerName}`;
        const audioSrc = customSpeechText[flowerName];
        if (audioSrc) {
            const audio = new Audio(audioSrc);
            audio.play();
        } else {
            alert(`找不到 ${flowerName} 的音訊檔案。`);
        }
    }

    // ✅ 清除所有解鎖進度
    const handleClearProgress = () => {
        localStorage.removeItem("unlockedImages"); // 清除紀錄
        setUnlockedImages({}); // 重設 state
        alert("✅ 所有花種解鎖狀態已重置！");
    };

      
      
    

    return (
        <div className="main-container">
            <div className="title-container">
                <img src="/images/彰化市.png" alt="彰化市" className="title-image" />
            </div>
            <div className="grid-container">
                {Object.entries(flowerImages).map(([flowerName, src]) => (
                    <div key={flowerName} className="flower-item">
                        <img
                            src={src}
                            alt={flowerName}
                            className="flower-image"
                            style={{
                                filter: unlockedImages[flowerName] ? "grayscale(0%)" : "grayscale(100%)",
                                transition: "filter 0.5s ease-in-out"
                            }}
                            onClick={() => {
                                localStorage.setItem("targetFlower", flowerName); // 記錄點的是哪個
                                navigate(`/App?target=${encodeURIComponent(flowerName)}`);
                            }}
                        />
                         <p 
                            className="flower-name"
                            onClick={() => handleSpeak(flowerName)}
                            style={{ cursor: "pointer", color: "blue", textDecoration: "underline" }}
                        >
                            🔊 {flowerName}
                        </p>
                    </div>
                ))}
            </div>
            

        <div className="bottom-bar">
                <h1 className="game" onClick={() => navigate("/game")}> 🧩 </h1>
                <button className="reset-btn" onClick={handleClearProgress}>🔄 清除紀錄</button> {/*重製*/} 

        </div>

        </div>
    );
};

export default Main;
