'use strict';
require('dotenv').config();
const routes = require('./routes.js')
const auth = require('./auth.js')
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const app = express();

const session = require('express-session')
const passport = require('passport')

const http = require('http').createServer(app)
const io = require('socket.io')(http)

const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });
const passportSocketIo = require('passport.socketio')
const cookieParser = require('cookie-parser')

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}))

app.use(passport.initialize())
app.use(passport.session())

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
)

app.set('view engine', 'pug')

myDB(async client => {
  const myDataBase = await client.db('database').collections('users')

  routes(app, myDataBase)
  auth(app, myDataBase)

  let currentUsers = 0;

  io.on('connection', (socket) => {
    ++currentUsers;
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    });
    console.log('A user has connected');
    socket.on('disconnect', () => {
      console.log('A user has disconnected');
      --currentUsers;
      io.emit('user', {
        name: socket.request.user.name,
        currentUsers,
        connected: false
      });
    });
  });

  io.on('chat message', message => {
    io.emit('chat message', {
      name: message.name,
      message: message.message
    })
  })

}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('pug', {
      title: e,
      message: 'Unable to login'
    })
  })
})

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io')
  
  accept(null, true)
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message)
  
  console.log('failure in connecing to socket.io: '+message)
  
  accept(null, false)
}

// As 'http' server is mounted on the express 'app', listen from the 'http', i.e., 'app.listen' changed to 'http.listen'
http.listen(process.env.PORT || 3000, () => {
  console.log('Listening on port ' + process.env.PORT);
})
