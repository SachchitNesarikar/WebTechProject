require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("./config/dbConnection");
const db = require("./config/dbConnection"); 
const userRouter = require('./routes/userRoute');
const webRouter = require('./routes/webRoute');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use("/api/user", userRouter);
app.use('/', webRouter);

app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal server error!";
    res.status(err.statusCode).json({ message: err.message });
});

app.post('/reset-password', (req, res) => {
    const { token, password, confirm_password } = req.body;

    if (!token) {
        return res.status(400).json({ msg: "Invalid password reset link" });
    }
    
    if (password !== confirm_password) {
        return res.status(400).json({ msg: "Passwords do not match" });
    }

    db.query("SELECT * FROM password_resets WHERE token = ?", [token], (err, result) => {
        if (err) {
            return res.status(500).json({ msg: "Database error while checking token" });
        }
        
        if (result.length === 0) {
            return res.status(400).json({ msg: "Invalid or expired token" });
        }

        const email = result[0].email;

        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                return res.status(500).json({ msg: "Error hashing password" });
            }

            db.query("UPDATE users SET password = ? WHERE email = ?", [hash, email], (error) => {
                if (error) {
                    return res.status(500).json({ msg: "Database update error" });
                }

                db.query("DELETE FROM password_resets WHERE email = ?", [email], (deleteError) => {
                    if (deleteError) {
                        return res.status(500).json({ msg: "Error deleting reset token" });
                    }
                    res.status(200).json({ msg: "Password reset successful" });
                });
            });
        });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
