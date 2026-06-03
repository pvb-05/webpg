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

// Route hiển thị trang thanh toán
router.get('/checkout', function(req, res, next) {
  res.render('checkout'); // Gọi file checkout.ejs trong thư mục views
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

// Giao diện khi khách hàng thanh toán thành công
router.get('/orders/success', (req, res) => {
    // Để nhanh gọn, chúng ta trả về một đoạn HTML đơn giản. 
    // Sau này bạn có thể tự tạo file success.ejs riêng cho đẹp mắt nhé!
    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h1 style="color: #28a745;">🎉 Thanh toán thành công!</h1>
            <p>Cảm ơn bạn đã mua cây cảnh tại Cây Nhà Lá Cành.</p>
            <p>Đơn hàng của bạn đang được xử lý và sẽ sớm giao đến bạn.</p>
            <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">Về trang chủ</a>
        </div>
    `);
});

// Giao diện khi khách hàng bấm Hủy giao dịch
router.get('/orders/cancel', (req, res) => {
    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h1 style="color: #dc3545;">❌ Đã hủy thanh toán!</h1>
            <p>Bạn đã hủy giao dịch chuyển khoản.</p>
            <a href="/checkout" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Thử đặt hàng lại</a>
        </div>
    `);
});

// Route hiển thị trang Lịch sử đơn hàng
router.get('/history', (req, res) => {
    // Câu lệnh SQL lấy tất cả đơn hàng, sắp xếp từ mới nhất đến cũ nhất
    const sql = `SELECT * FROM Orders ORDER BY id DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Lỗi tải lịch sử đơn hàng");
        }
        
        // Gửi mảng dữ liệu 'rows' ra ngoài file giao diện history.ejs
        res.render('history', { orders: rows });
    });
});

module.exports = router;
