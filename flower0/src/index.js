import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Main from './main';
import Login from './login'; // ✅ 確保組件名稱為大寫開頭
import Game from './game';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/App" element={<App />} /> {/* 根路徑顯示 App 元件 */}
        <Route path="/main" element={<Main />} /> {/* /main 路徑顯示 Main 元件 */}
        <Route path="/" element={<Login />} /> {/* /login 路徑顯示 login 元件 */}
        <Route path="/game" element={<Game />} /> {/* /game 路徑顯示 Game 元件 */}
      </Routes>
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
