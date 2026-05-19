const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'caynhalacanh.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Lỗi kết nối cơ sở dữ liệu:', err.message);
    } else {
        console.log('Đã kết nối thành công với database caynhalacanh.db');
    }
});

module.exports = db;