const Sequelize = require('sequelize');
const db = require('../config/DBConfig');

//Creates a user(s) table in MySQL Database. Note that Sequelize automatically pleuralizes the entity name as the table name

const User = db.define('user', {
    user_name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    gender: {
        type: Sequelize.STRING,
        allowNull: false
    },
    DOB: {
        type: Sequelize.DATEONLY,
        
        allowNull: false
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false
    },
    phone_no: {
        type: Sequelize.STRING,
        allowNull: false
    },
    address: {
        type: Sequelize.STRING,
        allowNull: false
    },
    postal_code: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    role: {
        type: Sequelize.ENUM('Member', 'Admin'),
        allowNull: false,
        defaultValue: 'Member'
    },
    travel_doc_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    status: {
        type: Sequelize.ENUM('Active', 'Banned'),
        allowNull: false,
        defaultValue: 'Active'
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
});

module.exports = User;