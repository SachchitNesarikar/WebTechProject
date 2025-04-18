const { check } = require("express-validator");

// Define signUpValidation correctly
const signUpValidation = [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please enter a valid email").isEmail().normalizeEmail({ gmail_remove_dots: true }),
    check("password", "Password must be at least 6 characters long").isLength({ min: 6 }),
];

const loginValidation = [
    check("email", "Please enter a valid email").isEmail().normalizeEmail({ gmail_remove_dots: true }),
    check("password", "Password must be at least 6 characters long").isLength({ min: 6 }),
];

const forgetValidation = [
    check("email", "Please enter a valid email").isEmail().normalizeEmail({ gmail_remove_dots: true }),
];

const updateValidation = [
    check("email", "Please enter a valid email").isEmail().normalizeEmail({ gmail_remove_dots: true }),
    check("password", "Password must be at least 6 characters long").isLength({ min: 6 }),
];

module.exports = { signUpValidation, loginValidation, forgetValidation, updateValidation }; // ✅ Ensure it is correctly exported
