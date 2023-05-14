const mogoose = require('mogoose');
const bcrypt = require('bcrypt');

const user_schema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true}

});

// hashujemy bcryptem przed zapisem do bazy

user_schema.pre('save', (next) => {
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

const User = mongoose.model('User', user_schema);
module.exports = User;