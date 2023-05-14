const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const passport_local_mongoose = require('passport-local-mongoose');

const user_schema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    email: {type: String, unique: true, required: true},
    password: {type: String}

});

// hashujemy bcryptem przed zapisem do bazy

user_schema.pre('save', function(next) {
    const user = this;
    if (!user.isModified('password')) return next();

    bcrypt.genSalt(10, (err, salt) => {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, (err, hash) => {
            if (err) return next(err);

            user.password = hash;
            next();
        });
    });
});

// weryfikacja hasla -> customowa metoda

user_schema.methods.Verify_Password = (password, callback) => {
    bcrypt.compare(password, this.password, (err, is_match) => {
        if (err) return callback(err);
        callback(null, is_match);
    });
};

user_schema.plugin(passport_local_mongoose, {
    usernameField: 'email',
    usernameQueryFields: ['email', 'username'],
    passwordField: 'password',
    errorMessages: {
        UserExistsError: 'Juz taki user istnieje...'
    }
});

const User = mongoose.model('User', user_schema);
module.exports = User;