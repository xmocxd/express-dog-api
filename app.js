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
const mongoose = require('mongoose');

const app = express();

const routes = require('./routes');
const db = require('./db');

const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use('/api', routes);

const conn = db.connect();

conn.on('connected', () => {
    console.log('Connected to DB successfully');
    console.log("Host:", conn.host);
    console.log("Port:", conn.port);
    console.log("Database Name:", conn.name);
    console.log("Ready State:", mongoose.STATES[conn.readyState]);
    if (process.env.NODE_ENV !== 'test') {
        app.listen(port, () => console.log(`Listening on port ${port}`));
    }
});

conn.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

conn.on('disconnected', () => {
    console.log('Mongoose disconnected.');
});

module.exports = app;