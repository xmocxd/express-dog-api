const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI;

const db = {};

db.connect = function() {
    mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
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