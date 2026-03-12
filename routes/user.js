// 1. **User Registration:** Allow users to register with a username and password. Passwords should be hashed before 
// storing in the database.

// 2. **User Authentication:** Enable users to log in using their credentials. Upon login, issue a token valid for 24
//  hours for subsequent authenticated requests.

const express = require('express');
const router = express.Router();
const user = require('../controllers/user');
const rateLimit = require('../middleware/rateLimit');

// Register a new user
// response body example
// {
//   "username": "alice",
//   "_id": "69b25b93395bfe8470a904b8",
//   "createdAt": "2026-03-12T06:22:11.600Z",
//   "updatedAt": "2026-03-12T06:22:11.600Z",
//   "__v": 0
// }
router.post('/register', rateLimit, user.register);

// Login a user and issue a token -- see response body for token for use in authenticated routes
// response body example
// {
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWIyNWI5MzM5NWJmZTg0NzBhOTA0YjgiLCJpYXQiOjE3NzMyOTY1NDUsImV4cCI6MTc3MzM4Mjk0NX0.vJpoUUiCrziAeBZet3U1mQl4tejl0X37kqGEUQkGx1A",
//   "user": {
//     "_id": "69b25b93395bfe8470a904b8",
//     "username": "alice",
//     "createdAt": "2026-03-12T06:22:11.600Z",
//     "updatedAt": "2026-03-12T06:22:11.600Z",
//     "__v": 0
//   }
// }
router.post('/login', rateLimit, user.login);

module.exports = router;