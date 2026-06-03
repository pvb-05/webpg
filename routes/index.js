var express = require('express');
var bcrypt = require('bcrypt');
var db = require('../db');
var router = express.Router();

/* GET views*/
router.get('/', function(req, res) {
  res.render('index');
});

router.get('/login', function(req, res) {
  res.render('login');
});

router.get('/register', function(req, res) {
  res.render('register');
});

router.get('/checkout', function(req, res, next) {
  res.render('checkout');
});

router.post('/register', async function(req, res, next) {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO Users (username, email, password) VALUES (?, ?, ?)";
    db.run(sql, [username, email, hashedPassword], function(err) {
      if (err) {
        return res.send('Lỗi: Tên đăng nhập hoặc Email đã tồn tại!');
      }
      res.redirect('/login');
    });
  } 
  catch (error) {
    next(error);
  }
});

router.post('/login', function(req, res, next) {
  const username = req.body.username;
  const password = req.body.password;

  const sql = "SELECT * FROM Users WHERE username = ?";
  db.get(sql, [username], async function(err, user) {
    if (err) {
      return res.send('Lỗi: Không thể đăng nhập!');
    }
    if (!user) {
      return res.send('Lỗi: Tên đăng nhập không tồn tại!');
    }

    try {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        req.session.user = {
          id: user.id,
          username: user.username
        };
        res.redirect('/');
      } 
      else {
        res.send('Lỗi: Mật khẩu không đúng!');
      }
    } 
    catch (error) {
      next(error);
    }
  });
});

router.get('/logout', function(req, res, next) {
  req.session.destroy();
  res.redirect('/');
});

router.get('/orders/success', (req, res) => {
    res.render('success');
});

router.get('/orders/cancel', (req, res) => {
    res.render('cancel');
});

// Route hiển thị trang Lịch sử đơn hàng cá nhân
router.get('/history', (req, res) => {
    // 1. KIỂM TRA ĐĂNG NHẬP đúng theo cấu trúc session của bạn
    if (!req.session.user) {
        return res.redirect('/login'); 
    }
    
    // Trỏ đúng vào thuộc tính 'id' nằm bên trong object 'user'
    const currentUserId = req.session.user.id;

    // 2. LỌC DỮ LIỆU: Chỉ lấy đơn hàng của user_id này
    const sql = `SELECT * FROM Orders WHERE user_id = ? ORDER BY id DESC`;
    
    db.all(sql, [currentUserId], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Lỗi tải lịch sử đơn hàng");
        }
        
        // Trả dữ liệu về giao diện
        res.render('history', { orders: rows });
    });
});

module.exports = router;
