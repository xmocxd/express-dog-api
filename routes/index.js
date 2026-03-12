const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// index for the other routes
router.use(require('./user'));
router.use(require('./dog'));

// test routes to validate basic API response

router.get('/', (req, res) => {
    res.send('express-dog-api test route -- OK\n');
});

router.get('/auth-test', auth, (req, res) => {
    res.send('express-dog-api AUTH test route -- OK\n');
});


module.exports = router;
