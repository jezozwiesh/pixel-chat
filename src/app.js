import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import LoginForm from './components/login-form';
import RegisterForm from './components/register-form';

const socket = io();

const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    socket.on('loggedIn', (user) => setUser(user));
    socket.on('loggedOut', () => setUser(null));
  }, []);

  const loginUser = (email, password) => {
    socket.emit('loginUser', { email, password }, (error) => {
      if (error) {
        alert(error);
      }
    });
  };

  const registerUser = (username, email, password) => {
    socket.emit('registerUser', { username, email, password }, (error) => {
      if (error) {
        alert(error);
      }
    });
  };

  const logoutUser = () => {
    socket.emit('logoutUser');
  };

  return (
    <div>
      {user ? (
        <div>
          <h1>Welcome, {user.username}!</h1>
          <button onClick={logoutUser}>Logout</button>
        </div>
      ) : (
        <div>
          <h1>Login</h1>
          <LoginForm loginUser={loginUser} />
          <h1>Register</h1>
          <RegisterForm registerUser={registerUser} />
        </div>
      )}
    </div>
  );
};

export default App;
