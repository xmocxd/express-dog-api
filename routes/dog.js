// 3. **Dog Registration:** Authenticated users can register dogs awaiting adoption, providing a name and a brief 
// description.

// 4. **Dog Adoption:** Authenticated users can adopt a dog by its ID, including a thank-you message for the original 
// owner. Restrictions apply: a dog already adopted cannot be adopted again, and users cannot adopt dogs they registered.

// 5. **Removing Dogs:** Owners can remove their registered dogs from the platform unless the dog has been adopted. 
// Users cannot remove dogs registered by others.

// 6. **Listing Registered Dogs:** Authenticated users can list dogs they've registered, with support for filtering 
// by status and pagination.

// 7. **Listing Adopted Dogs:** Authenticated users can list dogs they've adopted, with pagination support.

const express = require('express');

const router = express.Router();

const dog = require('../controllers/dog');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

router.post('/dogs', auth, rateLimit, dog.register);
router.post('/dogs/:id/adopt', auth, rateLimit, dog.adopt);
router.delete('/dogs/:id', auth, rateLimit, dog.remove);
router.get('/dogs/registered', auth, rateLimit, dog.listRegistered);
router.get('/dogs/adopted', auth, rateLimit, dog.listAdopted);

module.exports = router;