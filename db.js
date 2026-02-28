const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI;

const db = {};

db.connect = function() {
    if (!MONGO_URI) {
        console.error('MONGO_URI environment variable is required');
        process.exit(1);
    }
    mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });

    return mongoose.connection;
}

db.disconnect = function() {
    mongoose.disconnect()
    .then(() => {
        console.log('Disconnected from MongoDB');
    })
    .catch(err => {
        console.error('Error during disconnection:', err);
    });
}

module.exports = db;