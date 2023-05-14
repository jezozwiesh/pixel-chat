const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cookie: {
      sameSite: 'strict',
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 1 // 1 day
    }
  });
const path = require('path');

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

const cookie_parser = require('cookie-parser');
app.use(cookie_parser());

app.use(express.static(__dirname));
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(path.join(__dirname, "src")));
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

const session_middleware = session({
    secret: 'uwu_sekrecik',
    resave: false,
    saveUninitialized: false,
    store: Store 
})

app.use(session_middleware);
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
      } else {
        passport.authenticate('local')(req, res, () => {
          res.redirect('/login');
        });
      }
    });
});
  
app.post('/login', passport.authenticate('local', {failureRedirect: '/login'}), (req, res) => {
    req.session.username = req.user.username;
    res.redirect('/chat');
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


app.get('/client.js', function(req, res) {
    res.setHeader('Content-Type', 'text/javascript');
    res.sendFile(__dirname + '/client.js');
});

io.use((socket, next) => {
    session_middleware(socket.request, {}, next);
});

io.on('connection', (socket) => {
    console.log('user', socket.request.session.username, ' connected');

    Message.find({})
        .sort({created: -1})
        .then(messages => {
            socket.emit('init', messages.map((message) => ({ // mapujemy bo nie mozna stringowac obiektu bo wyjdzie username: [object Object]
                username: message.username,
                message: message.message,
                created: new Date(message.created).toLocaleString('pl-PL', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})
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
            message: data,
            created: Date.now().toLocaleString('pl-PL', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})
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

