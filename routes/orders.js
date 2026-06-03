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

    const userId = req.session.user ? req.session.user.id : null;

    if (!customer_name || !customer_phone || !shipping_address || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin!" });
    }

    db.serialize(() => {
        const orderSql = `INSERT INTO Orders (user_id, customer_name, customer_phone, shipping_address, total, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')`;
        
        db.run(orderSql, [userId, customer_name, customer_phone, shipping_address, total, payment_method], function(err) {
            if (err) return res.status(500).json({ success: false, error: err.message });

            const orderId = this.lastID; 
            const detailSql = `INSERT INTO OrderDetails (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`;
            const stmt = db.prepare(detailSql);
            items.forEach(item => stmt.run([orderId, item.product_id, item.quantity, item.price]));
            
            stmt.finalize(async (err) => {
                if (err) return res.status(500).json({ success: false, error: err.message });

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

router.post('/api/webhook', (req, res) => {
    const webhookData = req.body;

    console.log("🔔 Đã nhận Webhook từ payOS:", webhookData);

    if (webhookData && webhookData.data && webhookData.data.code === '00') {
        const orderCode = webhookData.data.orderCode; 

        const updateSql = `UPDATE Orders SET status = 'Paid' WHERE id = ?`;
        
        db.run(updateSql, [orderCode], function(err) {
            if (err) {
                console.error("Lỗi cập nhật DB:", err.message);
                return res.status(500).json({ success: false, message: "Lỗi Server" });
            }
            
            console.log(`✅ Đã cập nhật đơn hàng ${orderCode} thành công!`);
            return res.json({ success: true }); 
        });
    } else {
        res.json({ success: true });
    }
});

module.exports = router;