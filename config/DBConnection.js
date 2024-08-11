const mySQLDB = require('./DBConfig');
const User = require('../models/User');
const Attraction = require('../models/Attraction');
const Itinerary = require('../models/Itinerary');
const Cart = require('../models/Cart');
const Visitor = require('../models/Visitor');
const Ticket = require('../models/Ticket');
const Review = require('../models/Review');
const AttractionCounter = require('../models/AttractionCounter');
const Budget = require('../models/Budget');
const Expenses = require('../models/Expenses');
const session_login = require('../models/Session_login');
const email_notification = require('../models/Email_notification')

console.log(User);
console.log(Attraction);
console.log(Cart);

//if drop is true, all existing tables are dropped and recreated
const setUpDB = (drop) => {
    mySQLDB.authenticate()
        .then(() => {
            console.log('journeyjunction database connected');
        })
        .then(() => {
            // Define associations
            User.hasMany(Cart.Cart, { foreignKey: 'userId' });
            Attraction.hasMany(Cart.Cart, { foreignKey: 'attractionId' });
            User.hasMany(Visitor);
            Cart.Cart.hasMany(Ticket);
            User.hasMany(Ticket);
            Attraction.hasMany(Ticket);
            Attraction.hasMany(Review);
            User.hasMany(Review);
            Budget.hasMany(Expenses, { foreignKey: 'budgetId' });
            User.hasMany(session_login, { foreignKey: 'user_id' });
            mySQLDB.sync({ //creates table if none exists
                force: drop
            }).then(() => {
                console.log('Create tables if none exists')
            }).catch(err => console.log(err))
        })
        .catch(err => console.log('Error: ' + err));
};
module.exports = { setUpDB };