require("dotenv").config();

const mysql = require("mysql2");

const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

conn.connect((err) => {
    if (err) {
        console.error("Database connection failed: " + err.stack);
        return;
    }
    console.log(process.env.DB_NAME + " Successfully connected!");
});

module.exports = conn;
