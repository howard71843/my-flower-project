import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import "./game.css";

function Game() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [insertedPhoto, setInsertedPhoto] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const photoInputRef = useRef(null);
  const [draggingImage, setDraggingImage] = useState(null);
  const [resizeData, setResizeData] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [activeImage, setActiveImage] = useState(null);
  const whiteBoxRef = useRef(null); // 引用白色區塊
  const [customText, setCustomText] = useState("");   // 文字輸入欄的狀態
  const [selectedFont, setSelectedFont] = useState("cursive");  // 字體選擇的狀態
  const [textPosition, setTextPosition] = useState({ top: 240, left: 100 }); // 文字的位置
  const [draggingText, setDraggingText] = useState(false);  // 是否正在拖曳文字


  const [rotateData, setRotateData] = useState(null); // 儲存旋轉操作的相關數據

  const postcard = [
    "/style/style1.png",
    "/style/style2.png",
    "/style/style3.png",
  ];

  const templatePositions = {
    "/style/style1.png": { top: "60px",left: "130px", width: "35%",height: "60%" },
    "/style/style2.png": { top: "81px",left: "92px", width: "52%",height: "49%" },
    "/style/style3.png": { top: "84px",left: "68px", width: "51%",height: "50%" }
  };

  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
    setInsertedPhoto(null);
  };

  const handlePhotoInsert = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setInsertedPhoto(imageUrl);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !selectedTemplate) {
      alert("請先選擇一個模板再進入下一步");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };



// 點擊花卉圖片加入畫布，並設定初始位置
const handleImageClick = (imagePath) => {  
  const canvas = whiteBoxRef.current;
  let position = {
    top: 100,
    left: 100,
    width: 100,
    height: 100,
  };

  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    const offsetX = Math.floor(Math.random() * 40) - 20; // -20~20
    const offsetY = Math.floor(Math.random() * 40) - 20;

    position = {
      top: 150 + offsetY,
      left: 150 + offsetX,
      width: 100,
      height: 100,
    };
  }

  setSelectedImages((prevImages) => [ // 更新圖片的狀態
    ...prevImages,
    { id: Date.now(), path: imagePath, position,rotation : 0 }, // 新增圖片的資料
  ]);
};

const handleActivateImage = (id) => {  // 圖片選定設定位置
  setActiveImage(id);
};

const handleWhiteBoxClick = (event) => {
  if (event.target.className.includes("draw")) {   // 當使用者點擊白色區塊（畫布）時，取消選取圖片。
    setActiveImage(null);
  }
};

//拖曳圖片
const handleDragStart = (id, event) => {   
 //event.preventDefault();                  // 阻止默認拖曳行為
  if (resizeData) return;                   // 如果正在縮放，則不處理拖曳
  const startX = event.touches?.[0]?.clientX || event.clientX;   // 計算滑鼠點擊的起始位置
  const startY = event.touches?.[0]?.clientY || event.clientY;   // 計算滑鼠點擊的起始位置
  console.log(`🟡 handleDragStart - id: ${id}, x: ${startX}, y: ${startY}`);
  setDraggingImage({  // 設定拖曳的資料
    id,
    startX,
    startY,
  });
};

 //拖曳圖片
const handleDragMove = (event) => {  // 拖曳移動的處理函數
  if (!draggingImage|| !whiteBoxRef.current) return;        // 如果沒有拖曳的資料，則不處理拖曳

  const currentX = event.touches?.[0]?.clientX || event.clientX;   // 計算滑鼠當前位置
  const currentY = event.touches?.[0]?.clientY || event.clientY;  // 計算滑鼠當前位置
  console.log(`📦 handleDragMove - currentX: ${currentX}, currentY: ${currentY}`);

  const deltaX = currentX - draggingImage.startX;
  const deltaY = currentY - draggingImage.startY;

  setSelectedImages((prevImages) => // 更新圖片的位置
    prevImages.map((image) =>
      image.id === draggingImage.id
        ? {
            ...image,
            position: {
              ...image.position,
              top: image.position.top + deltaY,
              left: image.position.left + deltaX,
            },
          }
        : image
    )
  );

  setDraggingImage({    // 更新拖曳的資料
    ...draggingImage,
    startX: currentX,
    startY: currentY,
  });
};

//拖曳圖片
const handleDragEnd = () => {       // 拖曳結束
  setDraggingImage(null);
  console.log("✅ handleDragEnd");
};


//縮放圖片
const handleResizeStart = (id, corner, event) => {      // 縮放開始的處理函數
  //event.preventDefault();
  const startX = event.touches?.[0]?.clientX || event.clientX;
  const startY = event.touches?.[0]?.clientY || event.clientY;
  console.log(`🔵 handleResizeStart - id: ${id}, corner: ${corner}, x: ${startX}, y: ${startY}`);
  setResizeData({
    id,
    corner,
    startX,
    startY,
  });
};

//縮放圖片
const handleResizeMove = (event) => {   // 縮放移動的處理函數
  if (!resizeData) return;

  const currentX = event.touches?.[0]?.clientX || event.clientX;
  const currentY = event.touches?.[0]?.clientY || event.clientY;
  console.log(`📐 handleResizeMove - x: ${currentX}, y: ${currentY}`);

  const deltaX = currentX - resizeData.startX;
  const deltaY = currentY - resizeData.startY;

  setSelectedImages((prevImages) =>
    prevImages.map((image) => {
      if (image.id === resizeData.id) {
        const newPosition = { ...image.position };

        if (resizeData.corner.includes("right")) {
          newPosition.width = Math.max(50, newPosition.width + deltaX);
        }
        if (resizeData.corner.includes("left")) {
          newPosition.width = Math.max(50, newPosition.width - deltaX);
          newPosition.left += deltaX;
        }
        if (resizeData.corner.includes("bottom")) {
          newPosition.height = Math.max(50, newPosition.height + deltaY);
        }
        if (resizeData.corner.includes("top")) {
          newPosition.height = Math.max(50, newPosition.height - deltaY);
          newPosition.top += deltaY;
        }

        return { ...image, position: newPosition };
      }
      return image;
    })
  );

  setResizeData({
    ...resizeData,
    startX: currentX,
    startY: currentY,
  });
};

//縮放圖片
const handleResizeEnd = () => {   // 縮放結束的處理函數
  setResizeData(null);
  console.log("✅ handleResizeEnd");
};


// 計算影像中心點座標
const getImageCenter = (image) => {
  return {
    x: image.position.left + image.position.width / 2,
    y: image.position.top + image.position.height / 2
  };
};

// 計算兩點之間的角度（弧度）
const calculateAngle = (center, point) => {
  return Math.atan2(point.y - center.y, point.x - center.x);
};

// 開始旋轉操作
const handleRotateStart = (id, event) => {
  event.stopPropagation(); // 防止事件傳播
  event.preventDefault(); // 防止默認行為
  
  const clientX = event.touches?.[0]?.clientX || event.clientX;
  const clientY = event.touches?.[0]?.clientY || event.clientY;
  
  // 找到當前圖片
  const image = selectedImages.find(img => img.id === id);
  if (!image) return;
  
  // 計算圖片中心點
  const center = getImageCenter(image);
  
  // 計算初始角度
  const initialAngle = calculateAngle(center, { x: clientX, y: clientY });
  
  console.log(`🔄 handleRotateStart - id: ${id}, center: (${center.x}, ${center.y}), angle: ${initialAngle}`);
  
  // 設置旋轉數據
  setRotateData({
    id,
    center,
    initialAngle,
    startRotation: image.rotation || 0,
  });
};

// 處理旋轉移動
const handleRotateMove = (event) => {
  if (!rotateData) return;
  
  const clientX = event.touches?.[0]?.clientX || event.clientX;
  const clientY = event.touches?.[0]?.clientY || event.clientY;

  // 獲取圖像中心點與當前點的向量
  const center = rotateData.center;
  
  // 計算當前角度和初始角度（弧度）
  const currentAngle = calculateAngle(center, { x: clientX, y: clientY });
  const initialAngle = rotateData.initialAngle;
  
  // 計算角度變化（弧度）
  let angleDiff = currentAngle - initialAngle;
  
  // 檢測是否有跨越 ±π 邊界（保證順滑旋轉）
  if (angleDiff > Math.PI) {
    angleDiff -= 2 * Math.PI;
  } else if (angleDiff < -Math.PI) {
    angleDiff += 2 * Math.PI;
  }
  
  // 轉換為度數並加上初始旋轉角度
  const newRotation = rotateData.startRotation + (angleDiff * 180 / Math.PI);
  
  console.log(`🔄 handleRotateMove - newRotation: ${newRotation}`);
  
  // 更新圖片旋轉角度
  setSelectedImages(prevImages =>
    prevImages.map(image => 
      image.id === rotateData.id
        ? { ...image, rotation: newRotation }
        : image
    )
  );
};

// 結束旋轉操作
const handleRotateEnd = () => {
  setRotateData(null);
  console.log("✅ handleRotateEnd");
};


// 刪除圖片的處理函數
const handleDelete = (id) => {   
  setSelectedImages((prevImages) =>
    prevImages.filter((image) => image.id !== id)
  );
  setActiveImage(null);
};

//拖曳花圖 ＋ 縮放處理（圖片用）+ 旋轉處理
useEffect(() => {
  const handleTouchMove = (event) => {
    event.preventDefault(); // 阻止觸控滾動
    handleDragMove(event);   // 花圖移動
    handleResizeMove(event); // 花圖縮放
    handleRotateMove(event); // 花圖旋轉
  };

  const handleMouseMove = (event) => {
    handleDragMove(event);
    handleResizeMove(event);
    handleRotateMove(event);
  };

  const handleMouseUp = () => {
    handleDragEnd();
    handleResizeEnd();
    handleRotateEnd();
  };

  const handleTouchEnd = () => {
    handleDragEnd();
    handleResizeEnd();
    handleRotateEnd();
  };

  // 添加事件監聽器
  document.addEventListener("touchmove", handleTouchMove, { passive: false });
  document.addEventListener("touchend", handleTouchEnd);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  // 清理事件監聽器
  return () => {
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };
}, [draggingImage, resizeData, rotateData]); // 依賴項增加 rotateData


//拖曳文字處理（step 4 文字）
useEffect(() => {
    const handleMove = (e) => {
      if (!draggingText) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      setTextPosition((prev) => ({
        ...prev,
        left: clientX - prev.offsetX,
        top: clientY - prev.offsetY,
      }));
    };

    const handleUp = () => {
      setDraggingText(false);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleUp);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleUp);
    };
  }, [draggingText]);






  return (
    <>
      <div className="navbarr">
        <div className="navbar-logoo" onClick={() => navigate("/main")}>花間漫遊</div>
        <ul className="navbar-menuu">
          <li>製作明信片</li>
        </ul>
      </div>
      {/*🏠 導覽列*/}
      <div className="step-indicator">
        <span className={`step ${currentStep === 1 ? "active" : ""}`}>模板</span>
        <span className={`step ${currentStep === 2 ? "active" : ""}`}>照片</span>
        <span className={`step ${currentStep === 3 ? "active" : ""}`}>拼貼</span>
        <span className={`step ${currentStep === 4 ? "active" : ""}`}>選字</span>
        <span className={`step ${currentStep === 5 ? "active" : ""}`}>完成</span>
      </div>
      {/* 第一步模板-大圖*/ }
      {currentStep === 1 && (
        <>
          <div className="template-preview-large">
            {selectedTemplate ? (
              <img
                src={selectedTemplate}
                alt="選擇的模板"
                className="preview-large-img"
              />
            ) : (
              <p className="template-tip">請從下方選擇一個模板預覽</p>
            )}
          </div>
        {/* 第一步模板-縮圖*/ }
          <div className="template-thumbnails">
            {postcard.map((template, index) => (
              <img
                key={index}
                src={template}
                alt={`模板 ${index + 1}`}
                className={`thumbnail-img ${selectedTemplate === template ? "selected" : ""}`}
                onClick={() => handleTemplateClick(template)}
              />
            ))}
          </div>
        </>
      )}

      {/* 第二步圖片上傳 & 簡易第三步畫面*/ }
      {(currentStep === 2 ) && selectedTemplate && (
        <>
          <div className="photo-upload-section">   
            <h3 className="center-text">請點擊下方黑色區塊上傳照片</h3> 
            <input                     //隱藏上傳功能
              type="file"
              accept="image/*"
              ref={photoInputRef}
              onChange={handlePhotoInsert}
              className="file-input"
              style={{ display: "none" }}
            />
          </div>

          <div
            className="canvas"   //呈現整張明信片的樣貌
            ref={whiteBoxRef}
            style={{
              backgroundImage: selectedTemplate ? `url(${selectedTemplate})` : "none",
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center", 
              height: "400px",
              position: "relative",
              border: "1px solid #ccc",
            }} 
          >   
            {selectedTemplate && (       //放置照片的容器區域
              <div
                className="clickable-area"
                onClick={() => {
                  if (currentStep === 2) photoInputRef.current.click();
                }}
                style={{
                  position: "absolute",
                  ...templatePositions[selectedTemplate],
                  border: "2px dashed #aaa",
                  cursor: "pointer",
                }}
              >
                {insertedPhoto && ( //上傳的照片顯示區塊，放入照片的容器區
                  <img
                    src={insertedPhoto}
                    alt="插入的照片"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectPosition: "center"
                    }}
                  />
                )}
              </div>
            )}
            
          </div>
        </>
      )}

      {/* ✅ 第三步才出現花卉選擇列 */}
      {currentStep === 3 && (
        <div style={{ position: "relative", width: "100%", maxWidth: "400px", height: "400px", margin: "0 auto" }}>
    
        {/* ✅ 1. 最底層：背景模板 */}
        <div
          className="conva"
          style={{
            backgroundImage: selectedTemplate ? `url(${selectedTemplate})` : "none", // 選擇的模板
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            width: "100%",
            height: "100%",
            border: "1px solid #ccc",
            zIndex: 0,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />

        {/* ✅ 2. 第二層：插入的照片 */}
        {insertedPhoto && (
          <div
            className="inserted-photo"
            style={{
              position: "absolute",
              ...templatePositions[selectedTemplate],
              zIndex: 1,
            }}
          >
            <img
              src={insertedPhoto}
              alt="插入的照片"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }}
            />
          </div>
        )}

    {/* ✅ 3. 最上層：拼貼花朵 */}
    <div
      className="draw"
      ref={whiteBoxRef}
      onClick={handleWhiteBoxClick}
      onMouseMove={(e) => { handleDragMove(e); handleResizeMove(e); }}
      onMouseUp={() => { handleDragEnd(); handleResizeEnd(); }}
      onTouchMove={(e) => { handleDragMove(e); handleResizeMove(e); }}
      onTouchEnd={() => { handleDragEnd(); handleResizeEnd(); }}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 2,
        
      }}
    >
          {selectedImages.map((image) => (
            <div
              key={image.id}
              className={`conva ${activeImage === image.id ? "active" : ""}`}
              style={{
                position: "absolute",
                top: `${image.position.top}px`,
                left: `${image.position.left}px`,
                width: `${image.position.width}px`,
                height: `${image.position.height}px`,
                border: activeImage === image.id ? "1px dashed #666" : "none",
                zIndex: 3,
                transform: `rotate(${image.rotation || 0}deg)`, // 應用旋轉角度
                transformOrigin: 'center center', // 設置旋轉中心點
              }}
              onMouseDown={(e) => handleDragStart(image.id, e)}
              onTouchStart={(e) => handleDragStart(image.id, e)}
              onClick={() => handleActivateImage(image.id)}
            >
              <img
                src={image.path}
                alt="拼貼圖片"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
              {activeImage === image.id && (
                <>
                  <div className="resize-corner top-left" onMouseDown={(e) => handleResizeStart(image.id, "top-left", e)} onTouchStart={(e) => handleResizeStart(image.id, "top-left", e)} />
                  <div className="resize-corner top-right" onMouseDown={(e) => handleResizeStart(image.id, "top-right", e)} onTouchStart={(e) => handleResizeStart(image.id, "top-right", e)} />
                  <div className="resize-corner bottom-left" onMouseDown={(e) => handleResizeStart(image.id, "bottom-left", e)} onTouchStart={(e) => handleResizeStart(image.id, "bottom-left", e)} />
                  <div className="resize-corner bottom-right" onMouseDown={(e) => handleResizeStart(image.id, "bottom-right", e)} onTouchStart={(e) => handleResizeStart(image.id, "bottom-right", e)} />

                     
                  {/* 新增旋轉控制點 */}
                  <div 
                    className="rotate-handle" 
                    onMouseDown={(e) => handleRotateStart(image.id, e)}
                    onTouchStart={(e) => handleRotateStart(image.id, e)}
                    style={{
                      position: "absolute",
                      top: "-15px",
                      right: "-15px",
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "#4285f4",
                      cursor: "grab",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      color: "white",
                      fontSize: "14px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      zIndex: 10,
                    }}
                  >
                    ↻
                  </div>
                  <button className="delete-button" onClick={() => handleDelete(image.id)}>🗑️</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    )}

      {/* 第三步花卉選擇列 */ }
      {currentStep === 3 && (
        <div className="white-box" ref={whiteBoxRef}>
          <div className="flower-icons">
            {[
              "/flower/九重葛.png",
              "/flower/木棉花.png",
              "/flower/油桐花.png",
              "/flower/花旗木.png",
              "/flower/藍楹花.png",
              "/flower/黃花風鈴木.png",
            ].map((flower, index) => (
              <img
                key={index}
                src={flower}
                alt={`Flower ${index + 1}`}
                className="flower-icon"
                onClick={() => handleImageClick(flower)}
                
              />
            ))}
          </div>
        </div>
      )}

      {/* 第四步文字輸入 */ }
        {currentStep === 4 && (
          <div
            className="text-layer"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "400px",
              height: "400px",
              margin: "0 auto",
              backgroundImage: selectedTemplate ? `url(${selectedTemplate})` : "none", // 選擇的模板
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              border: "1px solid #ccc",
            }}
          >
            {/* 第二步步插入的照片 */}
            {insertedPhoto && (
              <div
                style={{
                  position: "absolute",
                  ...templatePositions[selectedTemplate],
                  zIndex: 1,
                }}
              >
                <img
                  src={insertedPhoto}
                  alt="插入的照片"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}

            {/* ✅ 拼貼花朵 - 第三步留下來的 selectedImages */}
            {selectedImages.map((image) => (
              <img
                key={image.id}
                src={image.path}
                alt="拼貼圖片"
                style={{
                  position: "absolute",
                  top: `${image.position.top}px`,
                  left: `${image.position.left}px`,
                  width: `${image.position.width}px`,
                  height: `${image.position.height}px`,
                  objectFit: "contain",
                  zIndex: 2,
                  pointerEvents: "none", // ✅ 避免影響文字拖曳操作
                }}
              />
            ))}

            {/* 使用者輸入文字 */}
            <div
              onMouseDown={(e) => {
                setDraggingText(true);
                setTextPosition({
                  ...textPosition,
                  offsetX: e.clientX - textPosition.left,
                  offsetY: e.clientY - textPosition.top,
                });
              }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                setDraggingText(true);
                setTextPosition({
                  ...textPosition,
                  offsetX: touch.clientX - textPosition.left,
                  offsetY: touch.clientY - textPosition.top,
                });
              }}
              style={{
                position: "absolute",
                top: `${textPosition.top}px`,
                left: `${textPosition.left}px`,
                zIndex: 2,
                fontFamily: selectedFont,
                fontSize: "22px",
                color: "#333",
                textAlign: "center",
                padding: "6px 12px",
                backgroundColor: "rgba(255, 255, 255, 0.7)",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                cursor: "move",
                userSelect: "none",
              }}
            >
              {customText}
            </div>


            
          </div>
        )}

      {/* 第四步文字輸入 */ }
      {currentStep === 4 && (
        <div style={{ textAlign: "center", margin: "10px auto" }}>
          <input
            type="text"
            placeholder="請輸入祝福文字"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            style={{ padding: "8px", width: "60%", borderRadius: "6px", border: "1px solid #ccc" }}
          />
          <select
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
            style={{ marginLeft: "10px", padding: "6px", borderRadius: "6px" }}
          >
          <option value="cursive">手寫風 (cursive)</option>
          <option value="sans-serif">簡潔風 (sans-serif)</option>
          <option value="serif">正式風 (serif)</option>
          <option value="monospace">打字機風 (monospace)</option>
          <option value="'DFKai-SB', serif">書楷體 (DFKai)</option>
          <option value="'Noto Serif TC', serif">Noto 書寫體</option>
          <option value="'Zhi Mang Xing', cursive" >芝麻行 (手寫體)</option>
          </select>
        </div>
      )}

      {/* 第五步完成畫面 */ }
        {currentStep === 5 && (
          <div style={{ textAlign: "center" }}>
            <h2>🎉 明信片完成！</h2>
            <div
              id="final-card"
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "400px",
                height: "400px",
                margin: "20px auto",
                backgroundImage: selectedTemplate ? `url(${selectedTemplate})` : "none",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                border: "1px solid #ccc",
              }}
            >
              {/* 上傳圖片 */}
              {insertedPhoto && (
                <div
                  style={{
                    position: "absolute",
                    ...templatePositions[selectedTemplate],
                    zIndex: 1,
                  }}
                >
                  <img
                    src={insertedPhoto}
                    alt="插圖"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              )}

              {/* 花貼圖 */}
              {selectedImages.map((image) => (
                <img
                  key={image.id}
                  src={image.path}
                  alt="貼圖"
                  style={{
                    position: "absolute",
                    top: `${image.position.top}px`,
                    left: `${image.position.left}px`,
                    width: `${image.position.width}px`,
                    height: `${image.position.height}px`,
                    objectFit: "contain",
                    zIndex: 2,
                  }}
                />
              ))}

              {/* 文字 */}
              <div
                style={{
                  position: "absolute",
                  top: `${textPosition.top}px`,
                  left: `${textPosition.left}px`,
                  fontFamily: selectedFont,
                  fontSize: "22px",
                  color: "#333",
                  padding: "6px 12px",
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  borderRadius: "8px",
                  textAlign: "center",
                  zIndex: 3,
                }}
              >
                {customText}
              </div>
            </div>

            <button
              onClick={async () => {
                const canvas = await html2canvas(document.getElementById("final-card")); // 將最終畫面轉換成圖片
                const link = document.createElement("a");
                link.download = "postcard.png";  // 下載的檔名
                link.href = canvas.toDataURL();  // 轉換成圖片格式
                link.click();
              }}
              style={{ padding: "10px 20px", marginTop: "10px", fontSize: "16px" }}
            >
              ⬇️ 下載明信片
            </button>
          </div>
        )}



      <div className="button-container">
        <button onClick={handlePrevStep} disabled={currentStep === 1}>
          上一步
        </button>
        <button onClick={handleNextStep} disabled={currentStep === 5}>
          下一步
        </button>
      </div>
    </>
  );
}

export default Game;
