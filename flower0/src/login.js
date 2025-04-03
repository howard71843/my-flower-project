/*login.js*/ 
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 引入 useNavigate
import './login.css'; // 確保這個 CSS 文件存在，並根據需要自訂樣式


function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // 初始化 useNavigate

  const validateForm = (event) => {
    event.preventDefault();
    if (username === 'admin' && password === '1234') {
        navigate('/main'); // 使用 React Router 跳轉到 /list2
    } else {
      alert('Invalid username or password.');
    }
  };

  return (
    <div className="bg" >
      <div className="login-container">    
        <h2>花間漫遊</h2>
        <form onSubmit={validateForm}>
          <input
            type="text"
            id="username"
            placeholder="帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            id="password"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">登入</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
