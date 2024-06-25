const express = require('express') //importing the express library for use
const app = express() //initialise the express class with a variable name app
const bodyParser = require('body-parser'); //import body-parser to use and named it as bodyParser
const exphbs = require('express-handlebars'); //importing the express handlebars
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const path = require('path');
const db = require('./config/db');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require('bcryptjs'); //for password encryption
const passport = require('passport');
const journeyjunctionDB = require('./config/DBConnection'); //bring in database connection
const methodOverride = require('method-override');
//connects to MySQL database
journeyjunctionDB.setUpDB(false); //To set up database with new tables set (true)
const port = 3000;

app.use(bodyParser.urlencoded({extended:true})); //use the body-parser to parseencoded url data
app.use(bodyParser.json()); //use the body-parser to parse json data
//enables session to be stored using browser's cookie ID
app.use(cookieParser());

app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    layoutsDir:__dirname+'/views/layouts',
    partialsDir: __dirname + '/views/partials/'
}));

app.set('view engine', 'hbs');


// Creates static folder for publicly accessible HTML, CSS and Javascript files
app.use(express.static(path.join(__dirname, 'public')));

// Session Store Configuration
const sessionStoreOptions = {
    host: db.host,
    port: db.port,
    user: db.username,
    password: db.password,
    database: db.database,
    clearExpired: true,
    //how frequently expired sessions will be cleared; milliseconds:
    checkExpirationalInterval: 900000,
    //the maximum age of a valid session; milliseconds:
    expiration: 900000
};
const sessionStore = new MySQLStore(sessionStoreOptions);

// Session Middleware
app.use(session({
    key: 'session_cookie_name',
    secret: 'session_cookie_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false
}));

// Flash Messages Middleware
app.use(flash());

//Method override middleware to use other HTTP methodsd such as PUT and DELETE
app.use(methodOverride('_method'));

// Middleware to set user object in response locals
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});

// ======== Navigation =============== 
app.get('/', (req,res) => {
    res.render('main', {layout: 'index'});
});

app.get('/about', (req,res) => {
    res.render('main', {layout: 'about'});
});

app.get('/booking', (req,res) => {
    res.render('main', {layout: 'booking'});
});

app.get('/service', (req,res) => {
    res.render('main', {layout: 'service'});
});

app.get('/destination', (req,res) => {
    res.render('main', {layout: 'destination'});
});

app.get('/contact', (req,res) => {
    res.render('main', {layout: 'contact'});
});

app.get('/package', (req,res) => {
    res.render('main', {layout: 'package'});
});

app.get('/team', (req,res) => {
    res.render('main', {layout: 'team'});
});

app.get('/testimonial', (req,res) => {
    res.render('main', {layout: 'testimonial'});
});

app.get('/404', (req,res) => {
    res.render('main', {layout: '404'});
});

app.get('/attractions', (req,res) => {
    res.render('main', {layout: 'attractions'});
});

app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
});