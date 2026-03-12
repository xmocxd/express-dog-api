const mongoose = require('mongoose');

// Dog Model

const dogSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adoptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  adoptedAt: { type: Date, default: null },
  thankYouMessage: { type: String, default: null },
}, { timestamps: true });

// Register a dog under the current user -- trims strings 
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

// Adopt an available dog by id
// Must have valid id, exists, not already adopted, and not adopting your own dog.
dogSchema.statics.adopt = async function (dogId, userId, { thankYouMessage } = {}) {
  // Validate dogId format
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

  // Check if dog is already adopted
  if (dog.adoptedBy) {
    const err = new Error('Dog has already been adopted');
    err.statusCode = 400;
    throw err;
  }

  // Check if user is trying to adopt their own dog
  if (dog.registeredBy?.toString() === String(userId)) {
    const err = new Error('You cannot adopt a dog you registered');
    err.statusCode = 400;
    throw err;
  }

  dog.adoptedBy = userId;
  dog.adoptedAt = new Date();

  // add thank you message if present
  dog.thankYouMessage = thankYouMessage ? String(thankYouMessage).trim() : null;

  await dog.save();
  return dog;
};

// Remove a dog you registered, as long as it hasn't been adopted.
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

  // Check if user is the owner of the dog
  if (dog.registeredBy?.toString() !== String(userId)) {
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

// List dogs registered by a user. Supports `status` (available/adopted) and paginates with sensible bounds
dogSchema.statics.listRegistered = async function (userId, { status, page = 1, limit = 10 } = {}) {
  // Normalize pagination inputs (accept strings, enforce min/max bounds).
  const p = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (p - 1) * lim;

  // Base filter: "dogs this user registered"
  const filter = { registeredBy: userId };

  // Optional status filter:
  // - available: not adopted yet
  // - adopted: adopted by someone (anyone)
  if (status === 'available') filter.adoptedBy = null;
  else if (status === 'adopted') filter.adoptedBy = { $ne: null };

  // Fetch the page and the total count in parallel for consistent pagination metadata
  const [dogs, total] = await Promise.all([
    this.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    this.countDocuments(filter),
  ]);
  return { dogs, pagination: { page: p, limit: lim, total, totalPages: Math.ceil(total / lim) } };
};

// List dogs adopted by a user, newest adoptions first, with pagination
dogSchema.statics.listAdopted = async function (userId, { page = 1, limit = 10 } = {}) {
  // Normalize pagination inputs (accept strings, enforce min/max bounds)
  const p = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (p - 1) * lim;

  // Filter: "dogs adopted by this user".
  const filter = { adoptedBy: userId };

  // Fetch the page and the total count in parallel for consistent pagination metadata
  const [dogs, total] = await Promise.all([
    this.find(filter).sort({ adoptedAt: -1 }).skip(skip).limit(lim).lean(),
    this.countDocuments(filter),
  ]);
  return { dogs, pagination: { page: p, limit: lim, total, totalPages: Math.ceil(total / lim) } };
};

module.exports = mongoose.model('Dog', dogSchema);
