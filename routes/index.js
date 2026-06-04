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

router.get('/logout', function(req, res, next) {
  req.session.destroy();
  res.redirect('/');
});

/* register handler */
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

/* login handler */
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


router.get('/orders/success', (req, res) => {
    res.render('success');
});

router.get('/orders/cancel', (req, res) => {
    res.render('cancel');
});

router.get('/history', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); 
    }
    
    const currentUserId = req.session.user.id;

    const sql = `SELECT * FROM Orders WHERE user_id = ? ORDER BY id DESC`;
    
    db.all(sql, [currentUserId], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Lỗi tải lịch sử đơn hàng");
        }
        res.render('history', { orders: rows });
    });
});

router.get('/checkout', function(req, res, next) {
  res.render('checkout');
});

router.get('/contact', function(req, res) {
  res.render('contact');
});
router.get('/about', function(req, res) {
  res.render('about');
});

// Render trang Gallery
router.get('/gallery', (req, res) => {
  const sql = `
    SELECT p.*, c.name as category_slug 
    FROM Products p 
    JOIN Categories c ON p.category_id = c.id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).send("Lỗi server");
    res.render('gallery', { products: rows });
  });
});

// Render trang chi tiết sản phẩm
router.get('/product', (req, res) => {
  const productId = req.query.id; // Lấy ID từ URL (ví dụ: ?id=1)

  if (!productId) {
    return res.redirect('/gallery');
  }

  // Truy vấn lấy thông tin sản phẩm
  const sql = `
    SELECT p.*, c.name as category_slug 
    FROM Products p 
    JOIN Categories c ON p.category_id = c.id 
    WHERE p.id = ?
  `;

  db.get(sql, [productId], (err, product) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Lỗi server");
    }
    if (!product) {
      return res.status(404).send("Không tìm thấy sản phẩm");
    }

    // Truy vấn lấy thêm 4 sản phẩm liên quan (cùng category)
    const relatedSql = `SELECT * FROM Products WHERE category_id = ? AND id != ? LIMIT 4`;
    db.all(relatedSql, [product.category_id, productId], (err, relatedProducts) => {
      
      // Truyền dữ liệu sang EJS
      res.render('product', { 
        product: product, 
        relatedProducts: relatedProducts || []
      });
    });
  });
});

module.exports = router;
