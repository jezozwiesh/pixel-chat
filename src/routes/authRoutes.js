const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../../models/user');

const router = express.Router();

function registerUser(req, res) {
  const { username, email, password } = req.body;
  User.findOne({ email })
  .then((user) => {
      if (user) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      const newUser = new User({ username, email, password });
      return newUser.save();
  })
  .then((user) => res.json({ message: 'User registered successfully', user }))
  .catch((error) => res.status(500).json({ message: 'Error registering user', error }));
}

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  return user;
};


function logoutUser(req, res) {
  req.logout();
  req.session.destroy((err) => {
    if (err) console.log(err);
    res.redirect('/login');
  });
}

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

module.exports = router;
