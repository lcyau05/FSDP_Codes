const Sequelize = require('sequelize');
const db = require('../config/DBConfig');

const Attractions = db.define('attraction', {
    location : {
        type: Sequelize.STRING,
        allowNull: false
    },
    priceadult : {
        type: Sequelize.FLOAT,
        allowNull: false
    },
    pricechild: {
        type: Sequelize.FLOAT,
        allowNull: false
    },
    image_path : {
        type: Sequelize.STRING,
        allowNull: false
    },
    disabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    }
});

module.exports = Attractions;