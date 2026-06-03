var express = require('express');
var session = require('express-session');
var path = require('path');

var indexRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// parse body form
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// session setup
app.use(session({
  secret: '15112005', 
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));

app.use(function(req, res, next) {
  res.locals.user = req.session.user || null;
  next();
});

// public setup
app.use(express.static(path.join(__dirname, 'public')));

// routes setup
app.use('/', indexRouter);

module.exports = app;
