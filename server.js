const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const mongoose = require('mongoose');
const db = mongoose.connection;
const {db_url} = require('./config.js')

const session = require('express-session');
const passport = require('passport');
const local_strategy = require('passport-local').Strategy;
const mongodb_store = require('connect-mongodb-session')(session);
const User = require('./models/user.js');

app.use(express.static(__dirname));
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/node_modules'));

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
const store = new mongodb_store({
    uri: db_url,
    collection: 'sessions'
});

store.on('error', (error) => {
    console.log(error);
});

passport.use(new local_strategy((username, password, done) => {
    User.findOne({ username: username }).then(user => {
        if (!user) {
            return done(null, false, {message: 'No user found with this username??'});
        }

        user.comparePassword(password, (error, is_match) => {
            if (error) return done(error);
            if (!is_match) return done(null, false, {message: 'Invalid username or password.'});
        });

        return done(null, user);
    }).catch(error => {
        return done(error);
    });
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id).then(user => {
        done(null, user);
    }).catch(error => {
        done(error);
    });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/client.js', function(req, res) {
    res.setHeader('Content-Type', 'text/javascript');
    res.sendFile(__dirname + '/client.js');
});

io.on('connection', (socket) => {
    console.log('an user connected');

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
    
    socket.on('set client username', function(username) {
        socket.username = username;
        console.log('user', username, 'set their username');
    });

    socket.on('message', function(data) {
        console.log('message received from', socket.username, ':', data);
        console.log('broadcasting to', socket.client.conn.server.clientsCount, 'clients');
        io.emit('message', {username: socket.username, message: data}); 

        const message = new Message({
            username: socket.username,
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
        console.log('user', socket.username, 'disconnected');
    });
});

