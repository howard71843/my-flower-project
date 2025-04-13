/* --- START OF FILE main.js --- */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./main.css";

// ... (keep flowerImages and customSpeechText definitions) ...
// 🌸 花卉名稱與對應圖片
const flowerImages = { /* ... */ };
// 🌸 **自訂每個花種的語音內容**
const customSpeechText = { /* ... */ };


const Main = () => {
    // ***** Get the current user *****
    const [currentUser, setCurrentUser] = useState(() => {
        return localStorage.getItem("currentUser") || null;
    });
    // ********************************

    // ✅ Use a user-specific key for unlockedImages state
    const [unlockedImages, setUnlockedImages] = useState(() => {
        const user = localStorage.getItem("currentUser"); // Get user first
        if (!user) return {}; // No user logged in, return empty state
        const userStorageKey = `unlockedImages_${user}`; // Create user-specific key
        const storedUnlockedImages = localStorage.getItem(userStorageKey);
        console.log(`Reading ${userStorageKey} from localStorage:`, storedUnlockedImages);
        return storedUnlockedImages ? JSON.parse(storedUnlockedImages) : {};
    });

    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    // Redirect if no user is logged in (optional but recommended)
    useEffect(() => {
        if (!currentUser) {
            console.warn("No current user found in localStorage. Redirecting to login.");
            // Optionally show a message before redirecting
            // alert("請先登入！");
            navigate('/login'); // Or your login route
        }
    }, [currentUser, navigate]);


    // ✅ Read AI result and unlock image for the CURRENT USER
    useEffect(() => {
        // Only run if currentUser is set
        if (!currentUser) return;

        const fetchResult = async () => {
            try {
                // Fetch AI result (Ensure this API endpoint doesn't need user context,
                // or modify it if it does)
                const response = await fetch(`${window.location.origin}/api/getResult`);
                const data = await response.json();
                console.log(`🌐 Got AI message for ${currentUser}:`, data.message);
                const targetFlower = localStorage.getItem("targetFlower"); // Get target flower
                setMessage(data.message); // Update message state (optional)

                // Check if AI result matches the target flower for unlock
                if (data.message && targetFlower && data.message.trim() === targetFlower) {
                    console.log(`👍 Match found for ${currentUser}! Unlocking ${targetFlower}.`);

                    // Update state AND user-specific localStorage
                    setUnlockedImages(prevState => {
                        // Avoid unnecessary updates if already unlocked
                        if (prevState[targetFlower]) {
                            return prevState;
                        }
                        const updatedState = {
                            ...prevState,
                            [targetFlower]: true,
                        };
                        // Save to user-specific key
                        const userStorageKey = `unlockedImages_${currentUser}`;
                        localStorage.setItem(userStorageKey, JSON.stringify(updatedState));
                        console.log(`💾 Saved unlocked status for ${currentUser} to ${userStorageKey}:`, updatedState);
                        return updatedState;
                    });

                    // Optional: Clear target flower after successful unlock?
                    // localStorage.removeItem("targetFlower");

                } else {
                     console.log(`🚫 No match or missing data for ${currentUser}. AI: '${data.message}', Target: '${targetFlower}'`);
                }
            } catch (error) {
                console.error(`❌ Failed to get AI message for ${currentUser}:`, error);
            }
        };

        fetchResult();
        // Dependency array includes currentUser to potentially re-run if user changes,
        // though typically this effect runs once on mount after login.
    }, [currentUser]);

    // Note: The separate useEffect synchronizing unlockedImages state to localStorage
    // is removed because saving now happens directly within the fetchResult logic
    // using the user-specific key. This avoids potential race conditions.

    // ✅ Handle speech (no user context needed here)
    const handleSpeak = (flowerName) => {
        const audioSrc = customSpeechText[flowerName];
        if (audioSrc) {
            const audio = new Audio(audioSrc);
            audio.play();
        } else {
            // Fallback or alert
            const utterance = new SpeechSynthesisUtterance(`這是${flowerName}`);
            speechSynthesis.speak(utterance); // Basic browser speech fallback
            console.warn(`Audio file not found for ${flowerName}. Using basic speech synthesis.`);
            // alert(`找不到 ${flowerName} 的音訊檔案。`);
        }
    };

    // ✅ Clear progress for the CURRENT USER
    const handleClearProgress = () => {
        if (currentUser) {
            const userStorageKey = `unlockedImages_${currentUser}`;
            localStorage.removeItem(userStorageKey); // Clear specific user's data
            setUnlockedImages({}); // Reset state in React
            alert(`✅ ${currentUser} 的花種解鎖狀態已重置！`);
            console.log(`Cleared progress for ${currentUser} (Key: ${userStorageKey})`);
        } else {
            alert("錯誤：無法識別目前使用者，無法清除紀錄。");
        }
    };

    // Render logic (check currentUser before rendering main content)
    if (!currentUser) {
        // Optional: Show a loading indicator or a message while redirecting
        return <div>載入中，或請先登入...</div>;
    }

    return (
        <div className="main-container">
            {/* Welcome message */}
            <div className="welcome-message">歡迎，{currentUser}！</div>

            <div className="title-container">
                <img src="/images/彰化市.png" alt="彰化市" className="title-image" />
            </div>
            <div className="grid-container">
                {Object.entries(flowerImages).map(([flowerName, src]) => (
                    <div key={flowerName} className="flower-item">
                        <img
                            src={src}
                            alt={flowerName}
                            // Check unlocked status from the user-specific state
                            className={`flower-image ${unlockedImages[flowerName] ? 'unlocked' : 'locked'}`}
                            style={{
                                filter: unlockedImages[flowerName] ? "grayscale(0%)" : "grayscale(100%)",
                                transition: "filter 0.5s ease-in-out",
                                cursor: "pointer" // Add cursor pointer to indicate clickability
                            }}
                            onClick={() => {
                                // Still set targetFlower globally for the camera page
                                localStorage.setItem("targetFlower", flowerName);
                                console.log(`Set targetFlower to: ${flowerName} for user ${currentUser}`);
                                navigate(`/App?target=${encodeURIComponent(flowerName)}`); // Navigate to camera/app page
                            }}
                        />
                         <p
                            className="flower-name"
                            onClick={() => handleSpeak(flowerName)}
                            style={{ cursor: "pointer", color: unlockedImages[flowerName] ? "inherit" : "#888", /* textDecoration: "underline" */ }}
                        >
                            {unlockedImages[flowerName] ? '🔊 ' : '🔒 '} {/* Indicate status */}
                            {flowerName}
                        </p>
                    </div>
                ))}
            </div>


            <div className="bottom-bar">
                <h1 className="game" onClick={() => navigate("/game")}> 🧩 </h1>
                <button className="reset-btn" onClick={handleClearProgress}>🔄 清除 {currentUser} 的紀錄</button>
                 {/* Optional Logout Button */}
                 <button className="logout-btn" onClick={() => {
                     localStorage.removeItem("currentUser");
                     // Optional: Clear other session-related things if needed
                     navigate('/login');
                 }}>登出</button>
            </div>

        </div>
    );
};

export default Main;
/* --- END OF FILE main.js --- */