const express = require('express');
const router = express.Router();
const db = require('../db');
const config = require('../config');

const { PayOS } = require('@payos/node');

const payos = new PayOS({
    clientId: config.PAYOS_CLIENT_ID,
    apiKey: config.PAYOS_API_KEY,
    checksumKey: config.PAYOS_CHECKSUM_KEY
});

router.post('/api/orders', (req, res) => {
    const { customer_name, customer_phone, shipping_address, total, payment_method, items } = req.body;

    // LẤY ID NGƯỜI DÙNG TỪ SESSION CHUẨN XÁC
const userId = req.session.user ? req.session.user.id : null;

    if (!customer_name || !customer_phone || !shipping_address || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin!" });
    }

    db.serialize(() => {
        // 2. SỬA CÂU LỆNH SQL: Khai báo rõ cột user_id
        const orderSql = `INSERT INTO Orders (user_id, customer_name, customer_phone, shipping_address, total, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')`;
        
        // 3. TRUYỀN BIẾN userId vào đầu mảng tham số
        db.run(orderSql, [userId, customer_name, customer_phone, shipping_address, total, payment_method], function(err) {
            if (err) return res.status(500).json({ success: false, error: err.message });

            const orderId = this.lastID; 
            const detailSql = `INSERT INTO OrderDetails (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`;
            const stmt = db.prepare(detailSql);
            items.forEach(item => stmt.run([orderId, item.product_id, item.quantity, item.price]));
            
            stmt.finalize(async (err) => {
                if (err) return res.status(500).json({ success: false, error: err.message });

                // Xử lý PayOS giữ nguyên như cũ
                if (payment_method === 'payos') {
                    try {
                        const paymentBody = {
                            orderCode: orderId,         
                            amount: total,              
                            description: `Thanh toan don ${orderId}`,
                            cancelUrl: config.CANCEL_URL,
                            returnUrl: config.RETURN_URL,
                            items: items.map(i => ({ name: `Ma SP ${i.product_id}`, quantity: i.quantity, price: i.price }))
                        };

                        const paymentLinkData = await payos.paymentRequests.create(paymentBody);

                        return res.json({
                            success: true,
                            message: "Tạo link thanh toán payOS thành công!",
                            orderId: orderId,
                            checkoutUrl: paymentLinkData.checkoutUrl
                        });

                    } catch (payOsError) {
                        return res.status(500).json({ success: false, message: "Lỗi khi tạo link với payOS", error: payOsError.message });
                    }
                }

                res.json({ success: true, message: "Đơn hàng COD đã được ghi nhận thành công!", orderId: orderId });
            });
        });
    });
});

// API Lắng nghe Webhook từ payOS
router.post('/api/webhook', (req, res) => {
    // 1. Nhận dữ liệu payOS gửi về
    const webhookData = req.body;

    console.log("🔔 Đã nhận Webhook từ payOS:", webhookData);

    // 2. Kiểm tra xem có phải thông báo thanh toán thành công không
    // Cấu trúc dữ liệu có thể khác nhau tùy phiên bản API, thường nó nằm trong webhookData.data.code
    if (webhookData && webhookData.data && webhookData.data.code === '00') {
        const orderCode = webhookData.data.orderCode; // Lấy ra mã đơn hàng (chính là orderId của chúng ta)

        // 3. Cập nhật trạng thái đơn hàng trong database SQLite thành 'Paid'
        const updateSql = `UPDATE Orders SET status = 'Paid' WHERE id = ?`;
        
        db.run(updateSql, [orderCode], function(err) {
            if (err) {
                console.error("Lỗi cập nhật DB:", err.message);
                return res.status(500).json({ success: false, message: "Lỗi Server" });
            }
            
            console.log(`✅ Đã cập nhật đơn hàng ${orderCode} thành công!`);
            // Bắt buộc phải trả về 200 OK để payOS biết bạn đã nhận tin, nếu không họ sẽ gửi lại liên tục
            return res.json({ success: true }); 
        });
    } else {
        // Trả về OK ngay cả khi không phải mã '00' để payOS không spam
        res.json({ success: true });
    }
});

module.exports = router;