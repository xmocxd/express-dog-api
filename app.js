// ## Requirements

// 1. **User Registration:** Allow users to register with a username and password. Passwords should be hashed before 
// storing in the database.

// 2. **User Authentication:** Enable users to log in using their credentials. Upon login, issue a token valid for 24
//  hours for subsequent authenticated requests.

// 3. **Dog Registration:** Authenticated users can register dogs awaiting adoption, providing a name and a brief 
// description.

// 4. **Dog Adoption:** Authenticated users can adopt a dog by its ID, including a thank-you message for the original 
// owner. Restrictions apply: a dog already adopted cannot be adopted again, and users cannot adopt dogs they registered.

// 5. **Removing Dogs:** Owners can remove their registered dogs from the platform unless the dog has been adopted. 
// Users cannot remove dogs registered by others.

// 6. **Listing Registered Dogs:** Authenticated users can list dogs they've registered, with support for filtering 
// by status and pagination.

// 7. **Listing Adopted Dogs:** Authenticated users can list dogs they've adopted, with pagination support.

// 8. **Error Handling and Edge Cases:** Anticipate and manage potential edge cases, providing appropriate HTTP 
// status codes.

// 9. **JSON:** Ensure the application can parse JSON payloads.

// 10. **CORS:** Use an npm package to enable CORS for resource sharing across domains.

// 11. **Environment Variables:** Securely store sensitive information such as database credentials in environment
//  variables.

// 12. **Layered Architecture:** Separate concerns by employing a layered architecture. The controller layer should
//  manage routing logic, while the model layer should focus on database interactions. This promotes maintainability
//  and scalability.

// 13. **Database Integration:** Use MongoDB Atlas for your cloud database needs. Integrate this database with your
//  application to manage data.

// 14. **Testing:** Test the functionality of your API using mocha and chai libraries to ensure all endpoints work
//  as expected.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const routes = require('./routes');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api', routes);

// Database Connection
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB Atlas');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });

module.exports = app;