const Sequelize = require('sequelize');
const db = require('../config/DBConfig');

const Ticket = db.define('ticket', {
    id: {
        type: Sequelize.STRING(8), // Assuming the ticket ID is a string with a max length of 8
        primaryKey: true,
        allowNull: false
    },
    type: {
        type: Sequelize.ENUM('Child', 'Adult'),
        allowNull: false
    },
    redeemed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
});

module.exports = Ticket;