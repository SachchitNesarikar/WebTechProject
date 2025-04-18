const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const db = require("../config/dbConnection");
const randomstring = require("randomstring");
const sendMail = require("../helpers/sendMail");
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

const registerUser = async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check if email already exists
    db.query("SELECT * FROM new WHERE LOWER(email) = LOWER(?)", [email], (err, result) => {
        if (err) {
            return res.status(500).send({ msg: "Database error!", error: err.message });
        }

        if (result.length) {
            return res.status(409).send({ msg: "This email is already in use!" });
        }

        // Hash the password
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                return res.status(500).send({ msg: "Error hashing password", error: err.message });
            }

            // ✅ Remove image reference from the query
            db.query("INSERT INTO new (name, email, password, is_verified) VALUES (?, ?, ?, ?)", 
                [name, email, hash, 0],  // Default is_verified = 0
                (err, result) => {
                    if (err) {
                        return res.status(500).send({ msg: "Database insertion error", error: err.message });
                    }

                    let mailSubject = "Mail Verification";
                    const randomToken = randomstring.generate();
                    let content = `<p>Hi ${name}, Please <a href="http://127.0.0.1:5000/mail-verification?token=${randomToken}">Verify</a> your Mail</p>`;

                    // ✅ Send verification email
                    sendMail(email, mailSubject, content)
                        .then(() => {
                            db.query("UPDATE new SET token = ? WHERE email = ?", [randomToken, email], (error) => {
                                if (error) {
                                    return res.status(500).send({ msg: "Error updating token", error: error.message });
                                }

                                return res.status(201).send({ msg: "User registered successfully!" });
                            });
                        })
                        .catch((mailError) => {
                            return res.status(500).send({ msg: "Error sending email", error: mailError.message });
                        });
                });
        });
    });
};

const verifyMail = (req, res) => {
    const token = req.query.token;

    // Check if token exists in the database
    db.query('SELECT * FROM new WHERE token = ? LIMIT 1', [token], (error, result) => {
        if (error) {
            console.error("Database error:", error.message);
            return res.status(500).send({ msg: "Database error", error: error.message });
        }

        if (result.length > 0) {
            const userId = result[0].id;

            // ✅ Correct SQL UPDATE query with parameterized values
            db.query('UPDATE new SET token = NULL, is_verified = 1 WHERE id = ?', [userId], (updateError) => {
                if (updateError) {
                    console.error("Update error:", updateError.message);
                    return res.status(500).send({ msg: "Verification update failed", error: updateError.message });
                }

                return res.render('mail-verification', { message: 'Mail Verified Successfully' });
            });

        } else {
            return res.render('404', { message: 'Invalid or Expired Token' });
        }
    });
};


const login = async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    db.query("SELECT * FROM new WHERE email = ?", [email], async (err, result) => {
        if (err) {
            return res.status(500).json({ msg: "Database error", error: err.message });
        }

        if (result.length === 0) {
            return res.status(401).json({ msg: "Invalid email or password" });
        }

        const user = result[0];

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ msg: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, is_admin: user.is_admin || 0 },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        db.query("UPDATE new SET last_login = now() where id= ?", [user.id], (err) => {
            if (err) {
                console.error("Error updating last_login:", err.message);
            }
            res.status(200).json({ msg: "Login successful", token });
        });
    });
};

const getUser = (req,res) => {
    const authToken= req.headers.authorization.split(' ')[1];
    const decode =jwt.verify(authToken, JWT_SECRET);

    db.query('SELECT * from new where id = ? ', decode.id, function(error,result,fields){
        if (error) throw error;
        return res.status(200).send({
            success: true,
            data: result[0],
            message: "Fetched Successfully!"
        });
        
    })
}

const forgetPassword = (req, res) => {
    console.log("Forget password function reached!");

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    var email = req.body.email;

    db.query("SELECT * FROM new WHERE email = ? LIMIT 1", [email], (error, result) => {
        if (error) {
            return res.status(500).json({ message: "Database error", error: error.message });
        }

        if (result.length === 0) {
            return res.status(400).send({ msg: "Email doesn't exist!" });
        }

        let mailSubject = "Forget Password";
        const randomString = randomstring.generate();
        let content = `<p>Hi ${result[0].name},</p>
               <p>Please <a href="http://127.0.0.1:5000/public/images/reset-password?token=${randomString}">Click Here</a> to reset your password.</p>`;


        sendMail(email, mailSubject, content)
            .then(() => {
                db.query("INSERT INTO password_resets (email, token) VALUES (?, ?)", [result[0].email, randomString], (err) => {
                    if (err) {
                        return res.status(500).send({ msg: "Error saving reset token", error: err.message });
                    }

                    return res.status(200).send({
                        message: "Mail Sent Successfully for Reset Password",
                    });
                });
            })
            .catch((mailError) => {
                return res.status(500).send({ msg: "Error sending email", error: mailError.message });
            });
    });
};

const resetPassword = (req, res) => {
    console.log("Request Body:", req.body);
    console.log("Request Headers:", req.headers);
    const { token, password, confirm_password } = req.body; // Get token from form submission

    if (!token) {
        return res.status(400).json({ msg: "Token is missing" });
    }

    if (password !== confirm_password) {
        return res.status(400).json({ msg: "Passwords do not match" });
    }

    db.query("SELECT * FROM password_resets WHERE token = ?", [token], (err, result) => {
        if (err) {
            return res.status(500).json({ msg: "Database error", error: err.message });
        }
        if (result.length === 0) {
            return res.status(400).json({ msg: "Invalid or expired token" });
        }

        const email = result[0].email;
        bcrypt.hash(password, 10, (hashErr, hash) => {
            if (hashErr) {
                return res.status(500).json({ msg: "Error hashing password" });
            }

            db.query("UPDATE new SET password = ? WHERE email = ?", [hash, email], (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({ msg: "Database update error" });
                }

                // Cleanup token after password update
                db.query("DELETE FROM password_resets WHERE email = ?", [email], (delErr) => {
                    if (delErr) {
                        console.error("Error deleting token:", delErr.message);
                    }
                });

                res.status(200).json({ msg: "Password reset successful" });
            });
        });
    });
};

const updateProfile = (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const token = req.headers.authorization.split(' ')[1];
        const decode = jwt.verify(token, process.env.JWT_SECRET);

        let sql = '';
        let data;

        if (req.file !== undefined) {
            sql = `UPDATE new SET name = ?, email = ?, image = ? WHERE id = ?`;
            data = [req.body.name, req.body.email, 'images/' + req.file.filename, decode.id];
        } else {
            sql = `UPDATE new SET name = ?, email = ? WHERE id = ?`;
            data = [req.body.name, req.body.email, decode.id];
        }

        db.query(sql, data, function (error, result) {
            if (error) {
                return res.status(400).send({ msg: error.message });
            }
            return res.status(200).send({ msg: 'Profile updated successfully!' });
        });

    } catch (error) {
        return res.status(400).json({ msg: error.message });
    }
};

module.exports = { registerUser, verifyMail, login, getUser, forgetPassword, resetPassword, updateProfile };