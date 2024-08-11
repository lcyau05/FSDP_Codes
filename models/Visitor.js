const Sequelize = require('sequelize');
const db = require('../config/DBConfig');

const Visitor = db.define('visitor', {
    fullName: {
        type: Sequelize.STRING,
        allowNull: false
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false
    },
    phone: {
        type: Sequelize.STRING,
        allowNull: false
    },
    DOB: {
        type: Sequelize.DATEONLY,
        allowNull: false
    },
    nationality: {
        type: Sequelize.STRING,
        allowNull: false
    },
    countryCode: {
        type: Sequelize.STRING,
        allowNull: false
    },
    isoCode: {
        type: Sequelize.STRING,
        allowNull: false
    },
    consentMarketing: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    },
    cardName: {
        type: Sequelize.STRING, allowNull: true,
    },
    cardType: {
        type: Sequelize.STRING, allowNull: true,
    },
    cardNo: {
        type: Sequelize.STRING, allowNull: true,
    },
    cardExp: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    invoiceid: {
        type: Sequelize.STRING,
        allowNull: true
    },
    subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
});

module.exports = Visitor;
