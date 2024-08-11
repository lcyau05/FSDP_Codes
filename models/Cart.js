const Sequelize = require('sequelize');
const db = require('../config/DBConfig');
const Attraction = require('./Attraction');

const Cart = db.define('cart', {
    dateOfAttraction: {
        type: Sequelize.DATEONLY,
        allowNull: false
    },
    noOfAdults: {
        type: Sequelize.FLOAT,
        allowNull: false
    },
    noOfChild: {
        type: Sequelize.FLOAT,
        allowNull: false
    },
    costOfAttraction: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    invoiceid: {
        type: Sequelize.STRING,
        allowNull: true
    },
    status: {
        type: Sequelize.ENUM('Cart', 'Paid', 'Refunding', 'Refunded'),
        allowNull: false,
        defaultValue: 'Cart'
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
});

// Function to update costOfAttraction in Cart based on number of adults and children
async function updateCostOfAttraction() {
    try {
        // Step 1: Retrieve all cart items
        const cartItems = await Cart.findAll({ raw: true });

        // Step 2: Loop through each cart item to calculate the total cost
        await Promise.all(cartItems.map(async (cartItem) => {
            const { id, attractionId, noOfAdults, noOfChild } = cartItem;

            // Retrieve attraction details
            const attraction = await Attraction.findByPk(attractionId, { raw: true });

            if (attraction) {
                const { priceadult, pricechild } = attraction;

                // Calculate total cost
                const totalCost = (noOfAdults * priceadult) + (noOfChild * pricechild);

                // Step 3: Update the costOfAttraction in Cart
                await Cart.update(
                    { costOfAttraction: totalCost },
                    { where: { id: id } }
                );
            }
        }));

        console.log('Cost of attraction updated successfully');
    } catch (error) {
        console.error('Error updating cost of attraction:', error);
        throw error; // Propagate the error to handle it further up the call stack
    }
}

module.exports = { Cart, updateCostOfAttraction };