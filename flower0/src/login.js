/*login.js*/ 
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 引入 useNavigate
import './login.css'; // 確保這個 CSS 文件存在，並根據需要自訂樣式


function Login() {
  const [name, setName] = useState('');
  const navigate = useNavigate(); // 初始化 useNavigate

  const handleLogin = async (event) => { // Make the function async
    event.preventDefault(); // 防止表單提交的默認行為
    const trimmedName = name.trim();

    if (trimmedName !== '') {
      try {
        // --- Call the backend to log the login event ---
        const response = await fetch('/api/log-login', { // Use await here
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: trimmedName }) // Send the trimmed name
        });

        if (!response.ok) {
          // Log an error if logging fails, but don't necessarily block login
          console.error('Failed to log login event:', response.status, await response.text());
          // You could show a non-blocking warning to the user if needed
        } else {
          localStorage.setItem("currentUser", trimmedName);
          console.log('Login event logged successfully for user:', trimmedName);
        }
        // Regardless of logging success/failure (unless you want to block), navigate
        navigate('/main');

      } catch (error) {
         console.error('Error calling log-login API:', error);
         // Decide if you still want to navigate if logging API call fails
         // For simplicity, we still navigate here.
         navigate('/main');
      }
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
