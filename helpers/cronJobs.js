const cron = require('node-cron');
const { Cart, updateCostOfAttraction } = require('../models/Cart'); // Adjust the path as needed
const { Op } = require('sequelize');

// Schedule a task to run every minute
cron.schedule('* * * * *', async () => {
    try {
        // Get the current time and calculate the cutoff time (20 minutes ago)
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - 20 * 60 * 1000); // 20 minutes ago

        // Delete items where createdAt is less than cutoffTime and status is 'Cart'
        await Cart.destroy({
            where: {
                status: 'Cart',
                createdAt: {
                    [Op.lt]: cutoffTime
                }
            }
        });

        console.log('Expired cart items deleted successfully');
    } catch (error) {
        console.error('Error deleting expired cart items:', error);
    }
});
