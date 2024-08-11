const express = require('express');
const router = express.Router();
const moment = require('moment');
const Budget = require('../models/Budget');
const cookieParser = require('cookie-parser');
// const { sendEmail } = require('../helpers/emailService');


router.use(cookieParser());
router.use(express.urlencoded({ extended: false }));

router.post('/budgetform', async (req, res) => {
    console.log("Request body:", req.body);

    let { category, amount } = req.body;
    let userId = req.user.id; // Assume userId is stored in session

    // Automatically set the month to the current month
    let month = new Date().toISOString().slice(0, 7);

    if (!category || amount <= 0) {
        return res.status(400).send("Invalid category or amount.");
    }

    if (!userId) {
        return res.status(401).send("Unauthorized: No user ID found in session.");
    }

    try {
        let budget = await Budget.findOne({ where: { userId, category, month } });

        if (budget) {
            budget.amount = amount;
            await budget.save();
        } else {
            await Budget.create({ category, amount, userId, month });
        }

        res.redirect('/budgetdashboard');
    } catch (err) {
        console.error("Error creating/updating budget:", err);
        res.status(500).send("Failed to create/update budget. Please try again.");
    }
});

// Route to update a budget
router.post('/updateBudget', async (req, res) => {
    try {
        const { id, amount } = req.body;
        const [updatedRows] = await Budget.update(
            {
                amount
            },
            { where: { id: id } }
        );

        if (updatedRows > 0) {
            res.redirect('/budgetdashboard');
        } else {
            res.status(404).send('Budget not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

module.exports = router;
