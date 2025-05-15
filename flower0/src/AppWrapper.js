// src/AppWrapper.js
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

// 假設你的頁面組件路徑如下，請根據你的實際情況修改
import Main from './main.js';           // ✅ Main.js 直接在 src/ 下
import CameraApp from './App.js';        // ✅ CameraApp (原 App.js) 直接在 src/ 下
import Login from './components/Login.js';    // 假設的登入頁面
// import Game from './components/Game.js'; // 如果你有 Game 頁面

// 這個內部組件用來訪問 useLocation 並管理 body class
const BodyClassManager = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    // 這裡是你的相機頁面路由，請確保它與 Routes 中定義的一致
    const cameraPageRoute = '/App'; // ⭐ 重要：修改為你相機頁面的實際路由路徑

    const isCameraPage = location.pathname === cameraPageRoute || location.pathname.startsWith(`${cameraPageRoute}?`);

    if (isCameraPage) {
      document.body.classList.add('camera-view-active');
      console.log('BodyClassManager: Added camera-view-active for path:', location.pathname);
    } else {
      document.body.classList.remove('camera-view-active');
      console.log('BodyClassManager: Removed camera-view-active for path:', location.pathname);
    }

    // 組件卸載或路徑改變前的清理
    return () => {
      document.body.classList.remove('camera-view-active');
      console.log('BodyClassManager: Cleanup - Removed camera-view-active');
    };
  }, [location.pathname]); // 依賴於路徑變化

  return <>{children}</>; // 將子組件渲染出來
};

function AppWrapper() {
  return (
    <BrowserRouter>
      <BodyClassManager> {/* 包裹 Routes */}
        <Routes>
          {/* ⭐ 重要：修改 path 和 element 以匹配你的組件和期望的路由 */}
          <Route path="/" element={<Login />} /> {/* 假設登入頁是根路徑 */}
          <Route path="/main" element={<Main />} />
          <Route path="/App" element={<CameraApp />} /> {/* 相機頁面，路徑要和 BodyClassManager 中一致 */}
          {/* <Route path="/game" element={<Game />} /> */}
          {/* 其他路由 */}
        </Routes>
      </BodyClassManager>
    </BrowserRouter>
  );
}

export default AppWrapper;