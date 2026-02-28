// 1. **User Registration:** Allow users to register with a username and password. Passwords should be hashed before 
// storing in the database.

// 2. **User Authentication:** Enable users to log in using their credentials. Upon login, issue a token valid for 24
//  hours for subsequent authenticated requests.

const express = require('express');
const router = express.Router();
const user = require('../controllers/user');
const rateLimit = require('../middleware/rateLimit');

router.post('/register', rateLimit, user.register);
router.post('/login', rateLimit, user.login);

module.exports = router;