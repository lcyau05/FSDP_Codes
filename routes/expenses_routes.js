const express = require('express');
const Expenses = require('../models/Expenses');
const Budget = require('../models/Budget');
const router = express.Router();
const bodyParser = require("body-parser");
const moment = require('moment');
const User = require('../models/User');
const cookieParser = require('cookie-parser');
router.use(cookieParser());
const { sendEmail } = require('../helpers/emailService'); // Import the email service


// Route to create an expense
router.post('/expensesform', async (req, res) => {
    const { transactionType, category, amount, transactionDate, description } = req.body;
    const userId = req.user.id; // Assume userId is stored in session
    const transactionMonth = moment(transactionDate).format('YYYY-MM');
    const currentMonth = moment().format('YYYY-MM'); // Get the current month in the same format

    if (!transactionType || !category || amount <= 0 || !transactionDate) {
        return res.status(400).send("Invalid input.");
    }

    if (!userId) {
        return res.status(401).send("Unauthorized: No user ID found in session.");
    }

    try {
        let budgetId = null;

        // Check if the transaction is for the current month
        if (transactionMonth === currentMonth) {
            // Only attempt to get a budget ID if the transaction is an expense
            if (transactionType.toLowerCase() === 'expense') {
                const budget = await Budget.findOne({
                    where: {
                        userId: userId,
                        category: category,
                        month: transactionMonth
                    }
                });

                if (!budget) {
                    return res.status(404).send("No budget found for the current month.");
                }

                budgetId = budget.id;

                // Retrieve the current totalSpent value
                const currentTotalSpent = parseFloat(budget.totalSpent) || 0;
                const newTotalSpent = currentTotalSpent + parseFloat(amount);

                // Update the totalSpent value in the Budget table
                await Budget.update(
                    { totalSpent: newTotalSpent.toFixed(2) },
                    { where: { id: budgetId } }
                );

                const useremail = await User.findOne({
                    attributes: ['email'], // Specify the fields you want to retrieve
                    where: {
                        id: userId
                    }
                });

                // Check if newTotalSpent reaches 50% or 100% of budget.amount and send email notifications
                const budgetAmount = parseFloat(budget.amount);
                const percentageSpent = (newTotalSpent / budgetAmount) * 100;

                if (percentageSpent >= 50 && percentageSpent < 100) {
                    const emailBody = `You have reached 50% of your budget for the category: ${category} for the month of ${transactionMonth}.`
                    await sendEmail({
                        to: useremail.email,
                        subject: 'JourneyJunction - Budget Alert: 50% Reached',
                        body: emailBody
                    });
                } else if (percentageSpent >= 100) {
                    const emailBody = `You have reached 100% of your budget for the category: ${category} for the month of ${transactionMonth}.`
                    await sendEmail({
                        to: useremail.email,
                        subject: 'JourneyJunction - Budget Alert: 100% Reached',
                        body: emailBody
                    });
                }
            }
        }

        await Expenses.create({
            transactionType,
            category,
            amount,
            transactionDate,
            description,
            budgetId,
            userId,
            month: transactionMonth
        });

        res.redirect('/expensesdashboard');
    } catch (err) {
        console.error('Error creating expense:', err);
        res.status(500).send("An error occurred while creating the expense.");
    }
});

router.post('/updateExpenses', async (req, res) => {
    try {
        const { id, transactionType, category, amount, transactionDate, description } = req.body;


        const [updatedRows] = await Expenses.update(
            {
                transactionType,
                category,
                amount,
                transactionDate,
                description
            },
            { where: { id: id } }
        );

        if (updatedRows > 0) {
            res.redirect('/viewalltransactions');
        } else {
            res.status(404).send('Transaction not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

module.exports = router; 