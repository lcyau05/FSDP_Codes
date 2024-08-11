const Sequelize = require('sequelize');
const db = require('../config/DBConfig');
const sequelize = require('../config/DBConfig');

const AttractionCounter = db.define('AttractionCounter', {
    attractionid: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    day: {
        type: Sequelize.DATEONLY,
        allowNull: false
    },
    count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
            max: 100
        }
    }

});

// Method to update or create a counter record
AttractionCounter.updateOrCreate = async (attractionId, day, count) => {
    const [record, created] = await AttractionCounter.upsert({
        attractionid: attractionId,
        day: day,
        count: count
    }, {
        returning: true
    });
    return record;
};

module.exports = AttractionCounter;