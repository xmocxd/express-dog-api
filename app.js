// ## Requirements

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
const bodyParser = require('body-parser');

const app = express();

const routes = require('./routes');
const db = require('./db');

const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api', routes);

let dbConnection = db.connect();

dbConnection.on('connected', () => {
    console.log('Connected to DB successfully');
    
    console.log("Host:", dbConnection.host);
    console.log("Port:", dbConnection.port);
    console.log("Database Name:", dbConnection.name);
    console.log("Ready State:", mongoose.STATES[dbConnection.readyState]);
    
    app.listen(port, () => {
        console.log(`Listening on port ${port}`);
    });
});

dbConnection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

dbConnection.on('disconnected', () => {
    console.log('Mongoose disconnected.');
});

module.exports = app;