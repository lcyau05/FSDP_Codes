const db = require('../config/dbWrapper');

function getDataForCharts(callback) {
    const queries = {
        genderQuery: 'SELECT gender, COUNT(*) AS count FROM users GROUP BY gender',
        growthQuery: 'SELECT DATE_FORMAT(createdAt, "%Y-%m-%d") AS day, COUNT(*) AS count FROM users GROUP BY day',

    };

    db.query(queries.genderQuery, (err, genderResults) => {
        if (err) {
            console.error('Error fetching gender data:', err); // Log the error
            return callback(err);
        }

        db.query(queries.growthQuery, (err, growthResults) => {
            if (err) {
                console.error('Error fetching growth data:', err); // Log the error
                return callback(err);
            }
            callback(null, {
                genderData: genderResults,
                growthData: growthResults,
            });
        });
    });
}

module.exports = { getDataForCharts };
