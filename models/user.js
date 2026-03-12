const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User Model

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

// Create a new user with a hashed password
userSchema.statics.register = async function (username, password) {
  // Validate input / trim
  if (!username || typeof username !== 'string' || !username.trim()) {
    const err = new Error('Username is required');
    err.statusCode = 400;
    throw err;
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    const err = new Error('Password must be at least 6 characters');
    err.statusCode = 400;
    throw err;
  }

  // Check for existing user
  const existing = await this.findOne({ username: username.trim().toLowerCase() });
  if (existing) {
    const err = new Error('Username already taken');
    err.statusCode = 409;
    throw err;
  }

  // Hash the password and create the user
  const hash = await bcrypt.hash(password, 10);
  const u = await this.create({
    username: username.trim().toLowerCase(),
    password: hash,
  });

  // Return the user object
  return u.toObject({ transform: (_, ret) => { delete ret.password; return ret; } });
};

// Validate credentials and return a safe user object (no password). Throws 401 for bad username/password.
userSchema.statics.login = async function (username, password) {
  // Validate input / trim
  if (!username || typeof username !== 'string' || !username.trim()) {
    const err = new Error('Username is required');
    err.statusCode = 400;
    throw err;
  }
  if (!password || typeof password !== 'string') {
    const err = new Error('Password is required');
    err.statusCode = 400;
    throw err;
  }

  // Find the user
  const u = await this.findOne({ username: username.trim().toLowerCase() });
  if (!u) {
    // User not found
    const err = new Error('Invalid username or password');
    err.statusCode = 401;
    throw err;
  }

  // Check if the password matches
  if (!(await bcrypt.compare(password, u.password))) {
    const err = new Error('Invalid username or password');
    err.statusCode = 401;
    throw err;
  }

  // Return the user object
  return u.toObject({ transform: (_, ret) => { delete ret.password; return ret; } });
};

module.exports = mongoose.model('User', userSchema);
