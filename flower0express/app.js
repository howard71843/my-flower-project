require('dotenv').config(); // 載入環境變數

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRouter = require('./routes/api'); // 引入 API 路由


var app = express();
var cors = require('cors');
app.use(cors()); // 允許所有來源存取 API

// ✅ **增加限制，允許處理較大的 Base64 圖片**
app.use(express.json({ limit: "50mb" }));  // 允許最大 50MB JSON
app.use(express.urlencoded({ extended: true, limit: "50mb" }));  // 允許較大的 URL 編碼數據



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));


// 設定靜態檔案路徑
// 1️⃣ 設定 API 路由先處理
app.use('/api', apiRouter);

// 2️⃣ 再提供 React 靜態檔
app.use(express.static(path.join(__dirname, "../flower0/build")));

// 3️⃣ 所有未知路由導向 React
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../flower0/build/index.html"));
});




app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', apiRouter); // 設定 API 路由


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
