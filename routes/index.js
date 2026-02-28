const express = require('express');
const router = express.Router();

router.use(require('./user'));
router.use(require('./dog'));

module.exports = router;
