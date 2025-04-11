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
      // You might want to add more specific validation here later if needed
      // For example, check if it contains Chinese characters, has a certain length, etc.

      // --- Optional: Store the name if needed in other parts of the app ---
      // You could use localStorage, sessionStorage, or React Context for this
      // Example using localStorage:
      // localStorage.setItem('userName', name.trim());

      // Navigate to the main page upon successful input
      navigate('/main');
    } else {
      // Show an alert if the name field is empty
      alert('請輸入您的姓名！');
    }
  }

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
