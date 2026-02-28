// 1. **User Registration:** Allow users to register with a username and password. Passwords should be hashed before 
// storing in the database.

// 2. **User Authentication:** Enable users to log in using their credentials. Upon login, issue a token valid for 24
//  hours for subsequent authenticated requests.

const User = require('../models/user');
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'dev-secret';

const user = {
  async register(req, res) {
    try {
      const { username, password } = req.body || {};
      const u = await User.register(username, password);
      res.status(201).json(u);
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
      if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
      if (err.code === 11000) return res.status(409).json({ message: 'Username already taken' });
      res.status(500).json({ message: 'Failed to register user' });
    }
  },

  async login(req, res) {
    try {
      const { username, password } = req.body || {};
      const u = await User.login(username, password);
      const token = jwt.sign({ userId: u._id }, secret, { expiresIn: '24h' });
      res.status(200).json({ token, user: u });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
      res.status(500).json({ message: 'Failed to login' });
    }
  },
};

module.exports = user;
