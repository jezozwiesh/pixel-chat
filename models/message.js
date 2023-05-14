const mongoose = require('mongoose');

const message_schema = new mongoose.Schema({
    username: String,
    message: String,
    created: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Message', message_schema);