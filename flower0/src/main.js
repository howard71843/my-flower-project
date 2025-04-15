/* --- START OF FILE main.js --- */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./main.css";

// 🌸 花卉名稱與對應圖片 (保持不變)
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

// 🌸 自訂每個花種的語音內容 (保持不變)
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
    const navigate = useNavigate();  // --- 新增：狀態，用於儲存當前登入的使用者名稱 ---
    const [currentUser, setCurrentUser] = useState(null); // --- 修改：unlockedImages 初始狀態為空，等待讀取使用者進度 ---
    const [unlockedImages, setUnlockedImages] = useState({});
    const [message, setMessage] = useState("");  // --- ✨ 新增：控制下拉選單是否開啟的狀態 ---
    const [isMenuOpen, setIsMenuOpen] = useState(false); // --- ✨ 新增：創建一個 ref 來指向選單容器 ---
    const menuRef = useRef(null);  // --- ✨ 新增：創建一個 ref 來指向選單容器 ---

    // --- 步驟 1：組件載入時，識別當前使用者 ---
    useEffect(() => {
        const user = localStorage.getItem('currentUser');   // 嘗試從 localStorage 中讀取使用者名稱
        if (user) {
            setCurrentUser(user);   // 如果找到了使用者，就設定到 state 中
            console.log(`👤 識別到目前使用者: ${user}`);
        } else {
            console.warn("⚠️ 在 localStorage 中找不到登入使用者。");  // 如果沒找到使用者，提示警告，可以選擇性地導回登入頁面
        }
    }, [navigate]);


    // --- 步驟 2：當識別到使用者後，載入該使用者的進度 ---
    useEffect(() => {
        // 只有在 currentUser 有值（即使用者已被識別）時才執行
        if (currentUser) {
            const progressKey = `unlockedImages_${currentUser}`;  // 構造該使用者專屬的 localStorage 鑰匙 (例如: "unlockedImages_王小明")
            console.log(`🔑 嘗試讀取鑰匙 "${progressKey}" 的進度`);
            const storedUnlockedImages = localStorage.getItem(progressKey);  // 從 localStorage 讀取該使用者的進度資料

            if (storedUnlockedImages) {
                // 如果找到了儲存的進度
                try {
                    setUnlockedImages(JSON.parse(storedUnlockedImages));  // 解析 JSON 字串為物件，並更新到 unlockedImages 狀態
                    console.log(`✅ 成功載入使用者 ${currentUser} 的進度。`);
                } catch (e) {
                    console.error("❌ 解析儲存的進度失敗:", e);  // 如果解析出錯（比如儲存的資料損壞）
                    localStorage.removeItem(progressKey);  // 刪除損壞的資料，避免下次載入再出錯
                    setUnlockedImages({}); // 重設為空狀態
                }
            } else {
                console.log(`ℹ️ 找不到使用者 ${currentUser} 的先前進度，將從新開始。`);  // 如果 localStorage 中沒有找到該使用者的進度  
                setUnlockedImages({}); // 確保狀態是空的
            }
        }
        // 這個 effect 會在 currentUser 狀態變化時執行（也就是說，在步驟 1 識別到使用者後執行）
    }, [currentUser]);


    // --- 步驟 3：讀取 AI 辨識結果，並更新『目前使用者』的解鎖進度 ---
    useEffect(() => {
        // 只有在 currentUser 有值時才執行
        if (!currentUser) {
            console.log("🚫 因未識別使用者，跳過讀取 AI 結果。");
            return; // 如果還不知道是哪個使用者，就不執行後面的邏輯
        }

        const fetchResult = async () => {
            try {
                // 使用相對路徑呼叫後端 API
                const response = await fetch(`/api/getResult`);
                if (!response.ok) {
                    // 如果 API 請求失敗，拋出錯誤
                    throw new Error(`API 請求失敗，狀態碼: ${response.status}`);
                }
                const data = await response.json();
                console.log("🌐 從後端獲取的訊息：", data.message);

                // 從 localStorage 讀取使用者上次點擊的是哪個花（這是全域的，假設流程很快）
                const targetFlower = localStorage.getItem("targetFlower");

                // 清理後端訊息可能存在的額外空格
                const cleanedMessage = data.message ? data.message.trim() : "";
                setMessage(cleanedMessage); // 更新顯示的訊息

                // 檢查後端訊息、目標花朵是否存在，並且兩者是否一致
                if (cleanedMessage && targetFlower && cleanedMessage === targetFlower) {
                    console.log(`🌸 找到匹配！ AI 結果: "${cleanedMessage}", 目標花朵: "${targetFlower}"`);

                    // 更新 unlockedImages 狀態
                    // 使用函數式更新，確保基於最新的狀態進行修改
                    setUnlockedImages(prevUnlocked => {
                        // 如果這朵花已經解鎖了，就直接返回舊狀態，避免不必要的更新
                        if (prevUnlocked[cleanedMessage]) {
                            console.log(`ℹ️ 花朵 "${cleanedMessage}" 已經解鎖過了。`);
                            return prevUnlocked;
                        }

                        // 創建一個新的狀態物件，包含之前的狀態，並將匹配到的花設為 true (解鎖)
                        const updatedState = {
                            ...prevUnlocked,         // 複製之前的解鎖狀態
                            [cleanedMessage]: true, // 將匹配到的花朵設為 true
                        };
                        console.log(`🔄 正在為使用者 ${currentUser} 解鎖 ${cleanedMessage}。新的狀態:`, updatedState);

                        // --- ✨ 關鍵：將更新後狀態儲存到『目前使用者』專屬的 localStorage 鑰匙下 ---
                        const progressKey = `unlockedImages_${currentUser}`;
                        try {
                           localStorage.setItem(progressKey, JSON.stringify(updatedState));
                           console.log(`💾 已將使用者 ${currentUser} 的更新後進度儲存到鑰匙 "${progressKey}"。`);
                        } catch (storageError) {
                           console.error("❌ 儲存進度到 localStorage 失敗:", storageError);
                           // 這裡可以考慮是否要撤銷狀態更新或提示使用者
                        }

                        // 返回新的狀態物件，讓 React 更新畫面
                        return updatedState;
                    });
                } else {
                     console.log(`🚫 沒有匹配或資料不完整。 AI 結果: "${cleanedMessage}", 目標花朵: "${targetFlower}"`);
                }

            } catch (error) {
                console.error("❌ 獲取 AI 訊息失敗：", error);
                setMessage("無法獲取辨識結果"); // 可以顯示錯誤訊息給使用者
            } finally {
                 // 可選：辨識流程結束後，清除目標花朵的記錄？
                 // localStorage.removeItem("targetFlower");
            }
        };

        fetchResult();
        // 這個 effect 依賴於 currentUser，確保在知道是哪個使用者後才執行
    }, [currentUser]);


    // --- ✨ 新增：處理點擊選單外部區域以關閉選單 ---
    useEffect(() => {
        // 定義點擊事件處理函數
        const handleClickOutside = (event) => {
            // 檢查選單 ref 是否存在，並且點擊的目標是否不在選單內部
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false); // 關閉選單
            }
        };

        // 如果選單是開啟的，就監聽 document 的 mousedown 事件
        if (isMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            console.log("🖱️ Added outside click listener");
        } else {
            // 如果選單是關閉的，就移除監聽器
            document.removeEventListener("mousedown", handleClickOutside);
            console.log("🖱️ Removed outside click listener");
        }

        // 清理函數：當組件卸載或 isMenuOpen 變化時，確保移除監聽器
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            console.log("🖱️ Cleanup: Removed outside click listener");
        };
    }, [isMenuOpen]); // 這個 effect 依賴於 isMenuOpen 狀態



    // --- 點擊花種名稱時播放語音 (保持不變) ---
    const handleSpeak = (flowerName) => {
        const audioSrc = customSpeechText[flowerName];
        if (audioSrc) {
            const audio = new Audio(audioSrc);
            audio.play();
        } else {
            console.warn(`找不到 ${flowerName} 的音訊檔案，使用語音合成備份。`);
             // 使用 Web Speech API 作為備份
            try {
                const speech = new SpeechSynthesisUtterance(`這是${flowerName}`);
                speech.lang = 'zh-TW'; // 指定語言
                window.speechSynthesis.speak(speech);
            } catch (speechError) {
                console.error("語音合成失敗:", speechError);
                alert(`找不到 ${flowerName} 的音訊檔案，也無法使用語音合成。`);
            }
        }
    }



    // --- 步驟 5：處理點擊花朵圖片的導航事件 ---
    const handleFlowerClick = (flowerName) => {
        // 檢查是否已識別使用者
        if (!currentUser) {
            alert("請先登入，才能開始辨識花朵！");
            navigate('/login'); // 導回登入頁
            return; // 阻止後續導航
        }
        // 記錄使用者想要辨識哪個花朵（這仍然是全域的，需注意）
        localStorage.setItem("targetFlower", flowerName);
        console.log(`🚀 使用者 ${currentUser} 點擊了 ${flowerName}，準備前往辨識頁面...`);
        // 導航到相機/辨識頁面（假設是 /App）
        navigate(`/App?target=${encodeURIComponent(flowerName)}`);
    };

    // --- 登出功能 ---
    const handleLogout = () => {
        if (currentUser) {
            console.log(`👋 使用者 ${currentUser} 正在登出...`);
            // 從 localStorage 移除登入狀態
            localStorage.removeItem('loggedInUser');
            // 清除 React state 中的使用者資訊
            setCurrentUser(null);
            setUnlockedImages({}); // 清空當前顯示的進度
            // 可選：清除其他相關的全域 localStorage 項目
            localStorage.removeItem('targetFlower');
            setIsMenuOpen(false); // ✨ 登出後關閉選單
            navigate('/login');
        }
    };


    // --- 渲染邏輯 ---
    // 在 currentUser 狀態確定之前，可以選擇顯示載入訊息
    // (注意：這個檢查可能很快完成，使用者不一定會看到)
    if (currentUser === null && localStorage.getItem('loggedInUser')) {
        // 如果 state 尚未設定，但 localStorage 中有使用者，顯示載入中
        return <div><p style={{textAlign: 'center', marginTop: '20px'}}>正在載入使用者資訊...</p></div>;
    }
    // 如果 localStorage 和 state 中都沒有使用者，可以選擇顯示提示或依賴 useEffect 中的導航
    // if (currentUser === null && !localStorage.getItem('loggedInUser')) {
    //     return <div><p>請先登入</p></div>;
    // }


    // --- ✨ 新增：切換選單開啟/關閉的函數 ---
    const toggleMenu = () => {
        setIsMenuOpen(prevState => !prevState); // 切換狀態
    };

    // --- 渲染邏輯 ---
    if (currentUser === null && localStorage.getItem('currentUser')) {
        return <div><p style={{textAlign: 'center', marginTop: '20px'}}>正在載入使用者資訊...</p></div>;
    }


    return (
        // 整體容器
        <div className="main-container">
            {/* 頂部標題和使用者資訊區 */}
            <div className="title-container">
                <img src="/images/彰化市.png" alt="彰化市" className="title-image" />
                {/* --- ✨ 右側使用者選單區 --- */}
                <div className="user-menu-container" ref={menuRef}> {/* ✨ 將 ref 附加到容器 */}
                    {currentUser ? (
                        <>
                            {/* 選單觸發按鈕 (用使用者名稱) */}
                            <button onClick={toggleMenu} className="menu-trigger">
                                👤 {currentUser} ▼ {/* 用 ▼ 表示可以下拉 */}
                            </button>

                            {/* 下拉選單 (條件渲染) */}
                            {isMenuOpen && (
                                <div className="dropdown-menu">
                                    {/* 登出選項 */}
                                    <button onClick={handleLogout} className="dropdown-item">
                                        登出
                                    </button>
                                    {/* 可以添加其他選單項目，例如 '個人資料' 等 */}
                                    {/* <button onClick={() => alert('前往個人資料')} className="dropdown-item">個人資料</button> */}
                                </div>
                            )}
                        </>
                    ) : (
                        // 如果沒有登入使用者，顯示登入按鈕
                        <button onClick={() => navigate('/login')} className="login-prompt-button">
                            請先登入
                        </button>
                    )}
                </div>
                {/* ------------------------ */}
            </div>

            

            {/* 花朵圖片網格 */}
            <div className="grid-container">
                {/* 遍歷 flowerImages 物件，為每個花朵創建一個顯示項目 */}
                {Object.entries(flowerImages).map(([flowerName, src]) => (
                    <div key={flowerName} className="flower-item">
                        {/* 花朵圖片 */}
                        <img
                            src={src}
                            alt={flowerName}
                            className="flower-image" // CSS class 用於基本樣式
                            style={{
                                // 根據 unlockedImages 狀態決定是否套用灰階濾鏡
                                // unlockedImages 現在是讀取的『目前使用者』的進度
                                filter: unlockedImages[flowerName] ? "grayscale(0%)" : "grayscale(100%)",
                                // 添加濾鏡變化的過渡效果
                                transition: "filter 0.5s ease-in-out",
                                // 改變滑鼠指標，提示可以點擊
                                cursor: "pointer"
                            }}
                            // 點擊圖片時，執行導航處理函數
                            onClick={() => handleFlowerClick(flowerName)}
                        />
                        {/* 花朵名稱 (可點擊播放語音) */}
                         <p
                            className="flower-name" // CSS class
                            onClick={() => handleSpeak(flowerName)} // 點擊時播放語音
                            style={{
                                cursor: "pointer", // 滑鼠指標設為手指
                                // 可選：根據是否解鎖改變文字顏色
                                color: unlockedImages[flowerName] ? "darkgreen" : "dimgray",
                                textDecoration: "underline" // 添加底線提示可點擊
                             }}
                            title={`點擊播放 ${flowerName} 的介紹`} // 滑鼠懸停提示
                        >
                            🔊 {flowerName}
                        </p>
                    </div>
                ))}
            </div>


            {/* 底部操作欄 */}
            <div className="bottom-bar">
                {/* 前往小遊戲的連結 (假設 /game 是小遊戲頁面) */}
                <h1 className="game" onClick={() => navigate("/game")} title="前往配對小遊戲"> 🧩 </h1>
                {/* 清除『目前使用者』紀錄的按鈕 */}
                
                {/* 登出按鈕 (移到頂部了，這裡可以移除或保留作為備用) */}
                {/* <button className="logout-btn" onClick={handleLogout} title="登出目前帳號">登出</button> */}
            </div>

        </div>
    );
};

export default Main;
/* --- END OF FILE main.js --- */