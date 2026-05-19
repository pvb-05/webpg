var express = require('express');
var bcrypt = require('bcrypt');
var db = require('../db');
const { route } = require('../app');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Login' });
});

router.get('/register', function(req, res, next) {
  res.render('register', { title: 'Register' });
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
        console.error("Lỗi Database:", err.message);
        return res.send('Lỗi: Tên đăng nhập hoặc Email đã tồn tại!');
      }
      res.redirect('/login');
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', function(req, res, next) {
  const username = req.body.username;
  const password = req.body.password;

  const sql = "SELECT * FROM Users WHERE username = ?";
  db.get(sql, [username], async function(err, user) {
    if (err) {
      console.error("Lỗi Database:", err.message);
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
          username: user.username,
          role: user.role
        };
        res.redirect('/');
      } else {
        res.send('Lỗi: Mật khẩu không đúng!');
      }
    } catch (error) {
      next(error);
    }
  });
});

router.get('/logout', function(req, res, next) {
  req.session.destroy(function(err) {
    if (err) {
      console.error("Lỗi khi đăng xuất:", err);
    }
    res.redirect('/');
  });
});

module.exports = router;
