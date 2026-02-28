const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

userSchema.statics.register = async function (username, password) {
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

  const existing = await this.findOne({ username: username.trim().toLowerCase() });
  if (existing) {
    const err = new Error('Username already taken');
    err.statusCode = 409;
    throw err;
  }

  const hash = await bcrypt.hash(password, 10);
  const u = await this.create({
    username: username.trim().toLowerCase(),
    password: hash,
  });

  return u.toObject({ transform: (_, ret) => { delete ret.password; return ret; } });
};

userSchema.statics.login = async function (username, password) {
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

  const u = await this.findOne({ username: username.trim().toLowerCase() });
  if (!u) {
    const err = new Error('Invalid username or password');
    err.statusCode = 401;
    throw err;
  }
  if (!(await bcrypt.compare(password, u.password))) {
    const err = new Error('Invalid username or password');
    err.statusCode = 401;
    throw err;
  }
  return u.toObject({ transform: (_, ret) => { delete ret.password; return ret; } });
};

module.exports = mongoose.model('User', userSchema);
