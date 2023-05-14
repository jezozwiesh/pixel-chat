const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');
const path = require('path');
const cookie_parser = require('cookie-parser');

const mongoose = require('mongoose');
const db = mongoose.connection;
const {db_url} = require('./configs/config.js')

const session = require('express-session');
const passport = require('passport');
const local_strategy = require('passport-local').Strategy;
const mongodb_store = require('connect-mongodb-session')(session);
const User = require('./models/user.js');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(__dirname));
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/node_modules'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


http.listen(2137, () => {
    console.log('listening on *:2137');
});

mongoose.connect(db_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('successfully connected to the database');
}).catch((err) => {
    console.error(err);
});

const Message = require('./models/message.js');
const cookieParser = require('cookie-parser');

db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// session store config
const Store = new mongodb_store({
    mongooseConnection: mongoose.connection,
    uri: db_url,
    collection: 'sessions'
});

Store.on('error', (error) => {
    console.log(error);
});

io.use(passportSocketIo.authorize({    
    cookieParser: cookie_parser,
    key: 'express.sid',    
    secret: 'uwu_sekrecik', 
    store: Store
}));
app.use(passport.initialize());
app.use(passport.session());
  

// Passport configuration
passport.use(new local_strategy({
    usernameField: 'email',
    passwordField: 'password'
}, User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// Routes

app.post('/register', (req, res) => {
    const {username, email, password} = req.body;
    
    User.register(new User({username: username, email: email}), password, (err, user) => {
      if (err) {
        console.log(err);
        console.log('tutaj je blad!');
      } else {
        passport.authenticate('local')(req, res, () => {
          res.redirect('/login');
        });
      }
    });
});
  
app.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user) {
        if(err) return next(err);
        if(!user) return res.status(401).send('Niepoprawne email lub haslo');
        req.logIn(user, function(err){
            if(err) return next(err);
            req.session.username = req.user.username;
            return res.redirect('chat');
        });
    })(req, res, next);
});

app.get('/login', (req, res) => {
    res.render('login');
});  
  
app.get('/register', (req, res) => {;
    res.render('register');
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.get('/chat', (req, res) => {
    res.render('chat');
});

app.get('/', (req, res) => {
    res.render('index');
});

// io.on('registerUser', async({username, email, password}) => {
//     try{
//         const user = await authRoutes.registerUser(username, email, password);
//         socket.emit('loggedIn', user);
//     } catch (error) {
//         socket.emit('loginError', error.message);
//     }
// })

// io.on('loginUser', async ({ email, password }) => {
//     try {
//       const user = await authRoutes.loginUser(email, password);
//       socket.emit('loggedIn', user);
//     } catch (error) {
//       socket.emit('loginError', error.message);
//     }
// });

  


app.get('/client.js', function(req, res) {
    res.setHeader('Content-Type', 'text/javascript');
    res.sendFile(__dirname + '/client.js');
});

io.on('connection', (socket) => {
    console.log('an user', socket.request.session.username, ' connected');

    Message.find({})
        .sort({created: -1})
        .then(messages => {
            socket.emit('init', messages.map((message) => ({ // mapujemy bo nie mozna stringowac obiektu bo wyjdzie username: [object Object]
                username: message.username,
                message: message.message,
                created: message.create,
            })));
        })
        .catch(err => {
            throw err;
        });
    
    socket.on('message', function(data) {
        console.log('message received from', socket.request.session.username, ':', data);
        console.log('broadcasting to', socket.client.conn.server.clientsCount, 'clients');
        io.emit('message', {username: socket.request.session.username, message: data}); 

        const message = new Message({
            username: socket.request.session.username,
            message: data
        });

        message.save()
            .then(() => {
                console.log('message saved to database');
            })
            .catch((err) => {
                console.error(err);
            });
    });

    socket.on('disconnect', () => {
        console.log('user', socket.request.session.username, 'disconnected');
    });
});

