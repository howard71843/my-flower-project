// jwt.js
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET || '871208'; //  請從環境變數中獲取

//  生成 JWT
function generateToken(user) {
    const payload = {
        userId: user.id, //  使用者 ID
        username: user.username, //  使用者名稱
        // ... 其他需要儲存的資訊
    };
    const options = {
        expiresIn: '1h', //  token 的有效期
    };
    return jwt.sign(payload, jwtSecret, options);
}

//  驗證 JWT (與後端使用的驗證相同)
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, jwtSecret);
        return decoded;
    } catch (error) {
        return null; //  驗證失敗
    }
}

module.exports = { generateToken, verifyToken };