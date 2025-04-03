import React,{useRef, useCallback, useState} from "react";
import {Link} from "react-router-dom";    
import Webcam from "react-webcam";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faDownload } from "@fortawesome/free-solid-svg-icons";
import './camera.css';

function Camera() {

    const webcamRef = useRef(null);
    const [imagesrc, setImagesrc] = useState(null);
    const [filteredImage, setFilteredImage] = useState(null);
    const [filter, setFilter] = useState("none"); // 預設無濾鏡

      // **設定 Webcam 顯示大小**
     const videoWidth = 640;
     const videoHeight = 480;

     
     
     // 📸 擷取相片，確保大小與相機畫面相同
    const capture = useCallback(() => {
    if (webcamRef.current) {
      const image = webcamRef.current.getScreenshot({ width: videoWidth, height: videoHeight });
      setImagesrc(image);
      applyFilterAndText(image, filter, videoWidth, videoHeight);
        }
    }, [webcamRef, filter]);



    // 🎨 套用濾鏡 + 文字
  const applyFilterAndText = (imageSrc, filter) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.filter = filter; // ✅ 設定濾鏡
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // 📌 設定文字大小為圖片寬度的 8%
      const fontSize = Math.floor(canvas.width * 0.08);

        // 📌 加入漸層背景，讓文字更柔和
        const gradient = ctx.createLinearGradient(0, canvas.height - 150, 0, canvas.height);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0.3)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - 150, canvas.width, 150);

       // ✅ 加入「Good Morning! 早安！」字樣
       ctx.font = `bold ${fontSize}px Arial`;
       ctx.textAlign = "center";
       ctx.shadowColor = "black";
       ctx.shadowBlur = 5;
       ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
       ctx.lineWidth = 4;

     // 英文
     ctx.strokeText("Good Morning!", canvas.width / 2, canvas.height - 80);
     ctx.fillStyle = "white";
     ctx.fillText("Good Morning!", canvas.width / 2, canvas.height - 80);

     // 中文
     ctx.strokeText("☀️ 早安！祝你有美好的一天 ☕", canvas.width / 2, canvas.height - 30);
     ctx.fillText("☀️ 早安！祝你有美好的一天 ☕", canvas.width / 2, canvas.height - 30);

     const finalImage = canvas.toDataURL("image/jpeg");
     setFilteredImage(finalImage);
    };
  };

  // 📥 下載圖片
  const downloadImage = () => {
    if (filteredImage) {
      const link = document.createElement("a");
      link.href = filteredImage;
      link.download = "filtered-image.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

        return(
            <>
                {/* 🏠 導覽列 */}
                <div className="navbarr">
                <div className="navbar-logoo">
                    花間漫遊
                </div>
                <ul className="navbar-menuu">
                    <li><Link to="/main">Home</Link></li>
                </ul>
            </div>
           
            {/* 📷 相機區域 */}
            <div className="big-boxx">
                <div className="webcam-c">
                <Webcam   // 相機
                className="webcam-d"
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width={640}
                    height={480}
                />
                </div>
            </div>

             {/* 🎯 拍照按鈕 */}
            <div className="app">
                    <button className="capture-button" onClick={capture}>
                        <FontAwesomeIcon icon={faCamera} size="2x" />
                    </button> 
            </div>


            {/* 🖼 顯示截圖 + 濾鏡 + 文字 */}
            {imagesrc && (
                <div className="captured-container">
                  <h3>📸 拍攝結果</h3>
                  <div className="image-preview">
                    <img src={filteredImage} alt="Captured" className="captured-image" style={{ filter: filter }} />
                  </div>

                  {/* 濾鏡選擇 */}
                    <div className="filters">
                        <button onClick={() => setFilter("none")}>🔹 無濾鏡</button>
                        <button onClick={() => setFilter("grayscale(100%)")}>🖤 黑白</button>
                        <button onClick={() => setFilter("sepia(80%)")}>🎞 懷舊</button>
                        <button onClick={() => setFilter("blur(3px)")}>🌫 模糊</button>
                        <button onClick={() => setFilter("contrast(200%)")}>⚡ 高對比</button>
                    </div>


                </div>
            )}
           
        </>
        );


}

export default Camera;