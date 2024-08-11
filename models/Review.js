const Sequelize = require('sequelize');
const db = require('../config/DBConfig');

const Review = db.define('review', {
    first_name: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    last_name: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    feedback: {
        type: Sequelize.TEXT,
        allowNull: false,
    }, //text classify
    rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    invoiceId: {
        type: Sequelize.STRING,
        allowNull: false,
    }
});

module.exports = Review;