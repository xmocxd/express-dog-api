// 3. **Dog Registration:** Authenticated users can register dogs awaiting adoption, providing a name and a brief 
// description.

// 4. **Dog Adoption:** Authenticated users can adopt a dog by its ID, including a thank-you message for the original 
// owner. Restrictions apply: a dog already adopted cannot be adopted again, and users cannot adopt dogs they registered.

// 5. **Removing Dogs:** Owners can remove their registered dogs from the platform unless the dog has been adopted. 
// Users cannot remove dogs registered by others.

// 6. **Listing Registered Dogs:** Authenticated users can list dogs they've registered, with support for filtering 
// by status and pagination.

// 7. **Listing Adopted Dogs:** Authenticated users can list dogs they've adopted, with pagination support.

const Dog = require('../models/dog');

const uid = (req) => req.user?.id ?? req.user?._id;

const dog = {
  async register(req, res) {
    try {
      const d = await Dog.register(uid(req), req.body);
      res.status(201).json(d);
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
      if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
      res.status(500).json({ message: 'Failed to register dog' });
    }
  },

  async adopt(req, res) {
    try {
      const d = await Dog.adopt(req.params.id, uid(req), req.body || {});
      res.status(200).json(d);
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
      res.status(500).json({ message: 'Failed to adopt dog' });
    }
  },

  async remove(req, res) {
    try {
      await Dog.remove(req.params.id, uid(req));
      res.status(200).json({ message: 'Dog removed successfully' });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
      res.status(500).json({ message: 'Failed to remove dog' });
    }
  },

  async listRegistered(req, res) {
    try {
      const data = await Dog.listRegistered(uid(req), req.query);
      res.status(200).json(data);
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
      res.status(500).json({ message: 'Failed to list registered dogs' });
    }
  },

  async listAdopted(req, res) {
    try {
      const data = await Dog.listAdopted(uid(req), req.query);
      res.status(200).json(data);
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
      res.status(500).json({ message: 'Failed to list adopted dogs' });
    }
  },
};

module.exports = dog;
