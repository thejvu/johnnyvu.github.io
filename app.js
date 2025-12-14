require('dotenv').config();

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');

const errorHandler = require('./app_api/middleware/errorHandler');
const CustomError = require('./app_api/utils/customError');

var indexRouter = require('./app_server/routes/index');
var usersRouter = require('./app_server/routes/users');
var travelRouter = require('./app_server/routes/travel');
var apiRouter = require('./app_api/routes/index');  

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'app_server', 'views'));
app.set('view engine', 'hbs');

// Bring in the database
require('./app_api/models/db');  

// Wire in our authentication module
var passport = require('passport');
require('./app_api/config/passport');

// register handlebars partials
var hbs = require('hbs');
hbs.registerPartials(path.join(__dirname, 'app_server', 'views', 'partials'));

// ADD HELMET - Security headers middleware
app.use(helmet());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());

// Enable CORS
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/travel', travelRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(new CustomError(`Route ${req.originalUrl} not found`, 404));
});

// Catch unauthorized error and create 401
app.use((err, req, res, next) => {
    if(err.name === 'UnauthorizedError') {
        next(new CustomError(err.message, 401));
    } else {
        next(err);
    }
});

// Centralized error handler - MUST be last
app.use(errorHandler);

module.exports = app;