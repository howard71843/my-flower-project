// --- START OF FILE App.js ---

import './App.css';
// ✅ Import useEffect, useCallback, useRef
import { useState, useEffect, useCallback, useRef } from "react";
import Webcam from "react-webcam";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";

// --- Add some CSS for the zoom slider ---
const customStyles = `
  .zoom-slider-container {
    position: absolute;
    bottom: 70px; /* Adjust position as needed */
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.5);
    padding: 5px 15px;
    border-radius: 15px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10; /* Ensure it's above the webcam view */
  }

  .zoom-slider-container span {
    color: white;
    font-size: 0.9em;
  }

  .zoom-slider {
    cursor: pointer;
  }

  /* Adjust button container position if needed */
  .button-container {
     bottom: 10px; /* Slightly lower to accommodate zoom */
  }
`;
// --- End of CSS ---


function App() {
  const [input, setInput] = useState(""); // Keep if used elsewhere, otherwise remove
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [result, setResult] = useState("");
  const webcamRef = React.useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const targetFlower = queryParams.get("target") || ""; // Default to empty string
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("");

  // --- State for Zoom ---
  const [zoom, setZoom] = useState(1);
  const [zoomCaps, setZoomCaps] = useState({ min: 1, max: 1, step: 0.1 }); // Default/fallback values
  const [isZoomSupported, setIsZoomSupported] = useState(false);
  const videoTrackRef = useRef(null); // To store the video track reference
  // --- End Zoom State ---

  // ✅ Function to get capabilities and set up zoom
  const handleUserMedia = useCallback((stream) => {
    console.log("Camera stream acquired.");
    const tracks = stream.getVideoTracks();
    if (tracks.length > 0) {
      const track = tracks[0];
      videoTrackRef.current = track; // Store the track reference
      console.log("Video Track:", track);

      // Check for zoom capability
      if (typeof track.getCapabilities === 'function') {
        try {
           const capabilities = track.getCapabilities();
           console.log("Track Capabilities:", capabilities);
           if (capabilities.zoom) {
             console.log("Zoom is supported.");
             setZoomCaps({
               min: capabilities.zoom.min || 1,
               max: capabilities.zoom.max || 1, // Use fallback if undefined
               step: capabilities.zoom.step || 0.1,
             });
             setIsZoomSupported(true);
             // Reset zoom to default (1) or min when camera starts/changes
             const initialZoom = Math.max(1, capabilities.zoom.min || 1);
             setZoom(initialZoom);
             // Apply initial zoom constraint if needed (optional)
             // track.applyConstraints({ advanced: [{ zoom: initialZoom }] });

           } else {
             console.log("Zoom not supported by this track.");
             setIsZoomSupported(false);
           }
        } catch (error) {
            console.error("Error getting capabilities:", error);
            setIsZoomSupported(false);
        }

      } else {
        console.log("track.getCapabilities() not supported.");
        setIsZoomSupported(false);
      }
    } else {
         console.log("No video tracks found.");
         setIsZoomSupported(false);
    }
  }, []); // Empty dependency array: This function definition doesn't depend on props/state

  // ✅ Effect to apply zoom when the zoom state changes
  useEffect(() => {
    if (!isZoomSupported || !videoTrackRef.current || typeof videoTrackRef.current.applyConstraints !== 'function') {
      return; // Exit if zoom not supported or track not available
    }

    const track = videoTrackRef.current;
    // Ensure zoom value is within reported capabilities before applying
    const clampedZoom = Math.max(zoomCaps.min, Math.min(zoom, zoomCaps.max));

    console.log(`Applying zoom constraint: ${clampedZoom}`);
    track.applyConstraints({ advanced: [{ zoom: clampedZoom }] })
      .then(() => {
        console.log(`Zoom successfully set to ${clampedZoom}`);
      })
      .catch(error => {
        console.error("Error applying zoom constraint:", error);
        // Optionally: Reset zoom state or notify user if apply fails
        // setIsZoomSupported(false); // Maybe disable if it fails consistently
      });

  }, [zoom, isZoomSupported, zoomCaps.min, zoomCaps.max]); // Re-run when zoom value or capabilities change


  const capturePhoto = () => {
    if (webcamRef.current) {
      // screenshotFormat and quality are handled by Webcam props now
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
          console.error("Failed to capture screenshot.");
          alert("無法拍攝照片，請稍後再試。");
          return;
      }
      console.log("📸 Screenshot Captured. Base64 Length:", imageSrc.length);

      // Optional: Keep size check, but high res images will be larger
      // Consider increasing the limit or implementing client-side resizing if needed
      const maxSize = 5 * 1024 * 1024; // Example: 5MB limit
      if (imageSrc.length > maxSize) {
        // You might want a more sophisticated check based on actual byte size
        // This length check is a rough estimate
        console.warn(`Image size (${(imageSrc.length / 1024 / 1024).toFixed(2)}MB) exceeds limit.`);
        alert("圖片可能過大，後續處理可能較慢或失敗。");
        // return; // Decide if you want to block large images
      }
      setImage(imageSrc);
      setResponse("");
      setResult("");
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    // Optional: Add file size check here too
    // if (file.size > 5 * 1024 * 1024) { alert("..."); return; }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImage(reader.result);
      setResponse("");
      setResult("");
    };
    reader.onerror = (error) => {
       console.error("Error reading file:", error);
       alert("讀取檔案時發生錯誤。");
    }
  };


  const handleGenerate = async () => {
    if (!image) return;

    setLoading(true);
    setResponse("");
    setResult(""); // Clear previous result text

    // Define API endpoints based on environment or keep as is if proxying
    const analyzeApiUrl = `${window.location.origin}/api/analyzeImage`;
    const resultApiUrl = `${window.location.origin}/api/getResult`;

    try {
      const response = await fetch(analyzeApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Sending potentially large base64 string in JSON body can be inefficient.
        // Consider FormData if backend supports it, but JSON is often simpler.
        body: JSON.stringify({ image }),
      });

      // Check if response is ok (status in 200-299 range)
      if (!response.ok) {
           // Try to get error message from backend if available
           let errorMsg = `HTTP error! status: ${response.status}`;
           try {
               const errorData = await response.json();
               errorMsg = errorData.error || errorData.message || errorMsg;
           } catch (e) { /* Ignore if response body is not JSON */ }
           throw new Error(errorMsg);
       }

      const data = await response.json();
      console.log("後端回應：", data);

      if (data.result) {
        const identifiedFlower = data.result.trim();
        setResponse(identifiedFlower); // Set the AI response

        const isCorrect = identifiedFlower === targetFlower.trim();

        // Update result text (removed this state as popup handles feedback)
        // setResult(isCorrect ? "✅ 比對成功！" : "❌ 比對失敗！");

        // Show popup
        setPopupMessage(isCorrect ? `🎉 辨識成功！是 ${identifiedFlower}` : `❌ 辨識失敗！ (AI 認為是 ${identifiedFlower})`);
        setPopupType(isCorrect ? "success" : "fail");
        setShowPopup(true);

        // 🔹 Save result to backend
        await fetch(resultApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              message: identifiedFlower, // Send what AI identified
              target: targetFlower,      // Send the target flower
              isCorrect: isCorrect       // Send the comparison result
          }),
        });

      } else {
        // Handle cases where backend responds 200 OK but no 'result' field
        console.error("Backend response missing 'result' field:", data);
        setResponse("無法辨識，請再試一次。");
        setResult(""); // Clear result text
        setPopupMessage("❌ 辨識失敗 (後端未回傳結果)");
        setPopupType("fail");
        setShowPopup(true);
      }

    } catch (error) {
      console.error("錯誤：", error);
      setResponse(`辨識時發生錯誤：${error.message}`);
      setResult(""); // Clear result text
      // Show error popup
      setPopupMessage(`❌ 辨識失敗 (${error.message})`);
      setPopupType("fail");
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle closing the popup
  const closePopup = () => setShowPopup(false);

  return (
    // Inject custom styles
    <>
      <style>{customStyles}</style>
      <div className="App">


        {/* ✅ Popup Window */}
        {showPopup && (
          <div className={`popup ${popupType}`}>
            <div className="popup-content">
              <p>{popupMessage}</p>
              <button onClick={closePopup}>關閉</button> {/* Use handler */}
            </div>
          </div>
        )}

        {/* 📌 Title Bar */}
        <div className="title-bar">
          <h1 className="title">🌸 花間漫遊 <span className="highlight">AI</span></h1>
        </div>

        {/* Webcam and Controls Container */}
        <div className="webcam-container">
          <Webcam
            ref={webcamRef}
            audio={false} // Disable audio if not needed
            // --- Resolution & Quality Settings ---
            screenshotFormat="image/png" // PNG is lossless, good quality
            // screenshotFormat="image/jpeg" // JPEG is smaller, use with quality
            // screenshotQuality={0.92}     // For JPEG, 0 to 1 (higher is better quality/larger size)
            videoConstraints={{
              // Request higher resolution - browser/device will try its best
              width: { ideal: 1920 }, // Example: Full HD width
              height: { ideal: 1080 },// Example: Full HD height
              // width: { ideal: 1280 }, // Example: HD width
              // height: { ideal: 720 }, // Example: HD height
              facingMode: "environment", // Use rear camera
              // aspectRatio: 16 / 9 // Optional: Enforce aspect ratio
              // ---- Don't set zoom here, we apply it dynamically ----
            }}
            forceScreenshotSourceSize={true} // IMPORTANT: Capture at stream resolution, not element size
            onUserMedia={handleUserMedia} // Callback when camera starts
            onUserMediaError={(error) => { // Handle camera errors
               console.error("Webcam UserMedia Error:", error);
               alert(`無法啟動相機: ${error.name} - ${error.message}`);
            }}
            className="webcam"
            mirrored={false} // Usually false for rear camera
          />

          {/* --- Zoom Slider --- */}
          {isZoomSupported && (
            <div className="zoom-slider-container">
               <span>🔎</span>
               <input
                  type="range"
                  min={zoomCaps.min}
                  max={zoomCaps.max}
                  step={zoomCaps.step}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="zoom-slider"
                  disabled={loading} // Disable while loading
               />
               <span>{zoom.toFixed(1)}x</span> {/* Display current zoom */}
            </div>
          )}
          {/* --- End Zoom Slider --- */}


          {/* Buttons Container */}
          <div className="button-container">
            <button className="back-btn" onClick={() => navigate("/main")} disabled={loading}>🔙 </button>
            <button className="icon-btn capture-btn" onClick={capturePhoto} disabled={loading}> {/* Added class */}
                 <FontAwesomeIcon icon={faCamera} size="2x" />
            </button>
            {/* Optional: Download Button */}
            {image && (
                 <button className="icon-btn download-btn" onClick={() => { // Added class
                    if (!image) return;
                    const link = document.createElement("a");
                    link.href = image;
                    link.download = `flower-capture-${Date.now()}.png`; // Add timestamp
                    document.body.appendChild(link); // Required for Firefox
                    link.click();
                    document.body.removeChild(link); // Clean up
                 }}
                 disabled={loading}
                 title="下載照片" // Tooltip
                 >
                 ⬇️
                 </button>
             )}
             {/* Optional: Clear Image Button */}
             {image && (
                 <button className="icon-btn clear-btn" onClick={() => {setImage(null); setResponse(""); setResult("");}} disabled={loading} title="清除照片"> {/* Added class */}
                    ❌
                 </button>
             )}
          </div>
       </div> {/* End webcam-container */}


        {/* File Upload Section */}
        <div className="upload-section">
            <label htmlFor="file-upload" className="upload-label">
                或選擇檔案上傳:
            </label>
            <input
                id="file-upload"
                type="file"
                accept="image/*" // Accept common image types
                onChange={handleImageUpload}
                style={{ display: 'none' }} // Hide default input, style the label
                disabled={loading}
            />
            <button onClick={() => document.getElementById('file-upload').click()} disabled={loading} className="upload-button">
                瀏覽...
            </button>
        </div>


        {/* Display Uploaded/Captured Image */}
        {image && (
          <div className="image-preview-container">
            {/* <p>預覽:</p> */}
            <img src={image} alt="Captured or Uploaded flower" className="image-preview" />
          </div>
        )}

        {/* Generate Button */}
        <button onClick={handleGenerate} disabled={loading || !image} className="generate-button">
          {loading ? "辨識中..." : "辨識花種"}
        </button>


        {/* 📌 AI Response Area */}
        <div className="ai-response">
            {/* Only show response text if not loading and response exists */}
            {!loading && response && <p className="response-text">{response}</p>}
            {/* The result/success/fail feedback is now primarily handled by the popup */}
            {/* Keep result text if needed for other purposes, otherwise remove */}
            {/* <p className="result-text" style={{ fontWeight: "bold", color: result.includes("成功") ? "green" : "red" }}>
                {result}
            </p> */}
        </div>
      </div>
    </>
  );
}

export default App;

// --- END OF FILE App.js ---