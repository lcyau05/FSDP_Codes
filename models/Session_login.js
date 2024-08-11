const Sequelize = require('sequelize');
const db = require('../config/DBConfig');

const session_login = db.define('session_login', {
    user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: 'users', // Reference the User model
            key: 'id' // Use the 'id' column from the User model
        }
    },
    login_time: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    },
    logout_time: {
        type: Sequelize.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
});

module.exports = session_login;