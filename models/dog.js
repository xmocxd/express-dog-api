const mongoose = require('mongoose');

const dogSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adoptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  adoptedAt: { type: Date, default: null },
  thankYouMessage: { type: String, default: null },
}, { timestamps: true });

dogSchema.statics.register = async function (userId, { name, description }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    const err = new Error('Dog name is required');
    err.statusCode = 400;
    throw err;
  }
  return this.create({
    name: name.trim(),
    description: description ? String(description).trim() : '',
    registeredBy: userId,
  });
};

dogSchema.statics.adopt = async function (dogId, userId, { thankYouMessage } = {}) {
  if (!mongoose.Types.ObjectId.isValid(dogId)) {
    const err = new Error('Invalid dog ID');
    err.statusCode = 400;
    throw err;
  }

  const dog = await this.findById(dogId);
  if (!dog) {
    const err = new Error('Dog not found');
    err.statusCode = 404;
    throw err;
  }

  if (dog.adoptedBy) {
    const err = new Error('Dog has already been adopted');
    err.statusCode = 400;
    throw err;
  }

  const ownerId = dog.registeredBy?.toString?.() ?? String(dog.registeredBy);
  if (ownerId === String(userId)) {
    const err = new Error('You cannot adopt a dog you registered');
    err.statusCode = 400;
    throw err;
  }

  dog.adoptedBy = userId;
  dog.adoptedAt = new Date();
  dog.thankYouMessage = thankYouMessage ? String(thankYouMessage).trim() : null;
  await dog.save();
  return dog;
};

dogSchema.statics.remove = async function (dogId, userId) {
  if (!mongoose.Types.ObjectId.isValid(dogId)) {
    const err = new Error('Invalid dog ID');
    err.statusCode = 400;
    throw err;
  }

  const dog = await this.findById(dogId);
  if (!dog) {
    const err = new Error('Dog not found');
    err.statusCode = 404;
    throw err;
  }

  const ownerId = dog.registeredBy?.toString?.() ?? String(dog.registeredBy);
  if (ownerId !== String(userId)) {
    const err = new Error('You can only remove dogs you registered');
    err.statusCode = 403;
    throw err;
  }

  if (dog.adoptedBy) {
    const err = new Error('Cannot remove a dog that has been adopted');
    err.statusCode = 400;
    throw err;
  }

  await this.findByIdAndDelete(dogId);
};

dogSchema.statics.listRegistered = async function (userId, { status, page = 1, limit = 10 } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (p - 1) * lim;
  const filter = { registeredBy: userId };
  if (status === 'available') filter.adoptedBy = null;
  else if (status === 'adopted') filter.adoptedBy = { $ne: null };
  const [dogs, total] = await Promise.all([
    this.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    this.countDocuments(filter),
  ]);
  return { dogs, pagination: { page: p, limit: lim, total, totalPages: Math.ceil(total / lim) } };
};

dogSchema.statics.listAdopted = async function (userId, { page = 1, limit = 10 } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (p - 1) * lim;
  const filter = { adoptedBy: userId };
  const [dogs, total] = await Promise.all([
    this.find(filter).sort({ adoptedAt: -1 }).skip(skip).limit(lim).lean(),
    this.countDocuments(filter),
  ]);
  return { dogs, pagination: { page: p, limit: lim, total, totalPages: Math.ceil(total / lim) } };
};

module.exports = mongoose.model('Dog', dogSchema);
