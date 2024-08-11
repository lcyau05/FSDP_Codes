const Sequelize = require('sequelize');
const db = require('../config/DBConfig');

const Itinerary = db.define('itinerary', {
    date : {
        type: Sequelize.DATEONLY,
        allowNull: false
    },
    activity : {
        type: Sequelize.STRING,
        allowNulll: false
    },
    location: {
        type: Sequelize.STRING,
        allowNull: false
    },
    time : {
        type: Sequelize.STRING,
        allowNull: false
    }

});

module.exports = Itinerary;