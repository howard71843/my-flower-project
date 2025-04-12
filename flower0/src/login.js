/*login.js*/ 
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 引入 useNavigate
import './login.css'; // 確保這個 CSS 文件存在，並根據需要自訂樣式


function Login() {
  const [name, setName] = useState('');
  const navigate = useNavigate(); // 初始化 useNavigate

  const handleLogin = (event) => {
    event.preventDefault(); // 防止表單提交的默認行為
    if (name.trim() !== '') {
      navigate('/main');
    } else {
      // Show an alert if the name field is empty
      alert('請輸入您的姓名！');
    }
  }

  fetch('/api/log-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: "王小明" })
  });
  
  

  return (
    <div className="bg" >
      <div className="login-container">    
        <h2>花間漫遊</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            id="name"
            placeholder="請輸入中文姓名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          
          <button type="submit">登入</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
