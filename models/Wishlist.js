const Sequelize = require('sequelize');
const db = require('../config/DBConfig');
const Attraction = require('./attractions');

const Wishlist = db.define('wishlist', {
    userId: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    attractionId: {
        type: Sequelize.INTEGER,
        references: {
            model: Attraction,
            key: 'id'
        }
    }
});

module.exports = Wishlist;