const express = require('express');
const router = express.Router();
const nationalities = require('../node_modules/@dropdowns/nationalities/json/nationalities.json');
const User = require('../models/User');
const attractions = require('../models/Attraction');
const itinerary = require('../models/Itinerary');
const { Cart, updateCostOfAttraction } = require('../models/Cart');
const Expenses = require('../models/Expenses');
const Budget = require('../models/Budget');
const axios = require('axios');
const Visitor = require('../models/Visitor');
const Ticket = require('../models/Ticket');
const Review = require('../models/Review');
const moment = require('moment');
const AttractionCounter = require('../models/AttractionCounter')
const SessionLogin = require('../models/Session_login');
const { Sequelize } = require('sequelize'); // Import Sequelize
const { getDataForCharts } = require('../models/dataModels');
const QRCode = require('qrcode');


//admin start
router.get('/', (req, res) => {
    res.render('index', { layout: 'main' });
});

router.get('/dashboard', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    res.render('admin/details', {
        layout: 'dashboard', role: user_role, user_name: userName
    });
});
//admin end

//ACCOUNT MANAGEMENT:
router.get('/email_notifications', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    res.render('ACCOUNTS/email_notification', { layout: 'main', role: user_role, user_name: userName });
});

router.get('/admin_dashboard', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;

    getDataForCharts((err, data) => {
        if (err) {
            console.error('Error getting data for charts:', err); // Log the error
            return res.status(500).send('Internal Server Error');
        }
        res.render('ACCOUNTS/admin_dashboard', { data, layout: 'dashboard', role: user_role }); // Ensure the view name and data are correct
    });
});

router.get('/sign_up', (req, res) => {
    console.log("In router.get (sign_up)")
    const user_role = null;
    const userName = 'Login';
    res.render('ACCOUNTS/sign_up', { layout: 'main', role: user_role, user_name: userName });
});

router.get('/login', (req, res) => {
    console.log("In router.get (login)")
    res.render('ACCOUNTS/login', { layout: 'main' });
});

router.get('/user_details', (req, res) => {
    console.log("in user_routes.js /user_details");
    const userId = req.user.id || req.session.userId;
    console.log('role: ', req.user.role);
    console.log('username', req.user.username);

    User.findOne({
        where: { id: userId },
        raw: true
    })
        .then(user => {
            if (user) {
                // Render the user_details.handlebars view, passing in user data
                res.render('ACCOUNTS/user_details', {
                    layout: 'dashboard',
                    user_id: user.id,
                    user_name: user.user_name,
                    gender: user.gender,
                    travel_doc_id: user.travel_doc_id,
                    phone_no: user.phone_no,
                    postal_code: user.postal_code,
                    address: user.address,
                    email: user.email,
                    DOB: user.DOB,
                    role: user.role
                });
            } else {
                // Handle case where user is not found
                res.status(404).send('User not found');
            }
        })
        .catch(err => {
            console.error('Error fetching user from database:', err);
            res.status(500).send('Internal Server Error');
        });
});

router.get('/user_update', (req, res) => {
    // The user ID is now available in req.user.user_id or req.session.userId
    const user_role = req.user.role;
    const userName = req.user.username;
    const userId = req.user.id || req.session.userId;

    User.findOne({
        where: { id: userId },
        raw: true,
        nest: true
    })
        .then((user) => {
            if (user) {
                res.render('ACCOUNTS/user_update', { layout: 'dashboard', role: user_role });
            } else {
                res.status(404).send('User not found');
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Server error');
        });
});

router.get('/logout', async function (req, res, next) { //SessionLogin
    console.log("Logging Out");
    try {
        // Assuming req.user contains the user's ID
        const userId = req.user.id;

        // Update the logout_time for the user's session
        await SessionLogin.update(
            { logout_time: new Date() },
            {
                where: {
                    user_id: userId,
                    logout_time: null, // Update only the active session
                }
            }
        );
        req.logout(function (err) {
            if (err) {
                return next(err);
            }
            req.session.destroy(function (err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        });
    } catch (err) {
        next(err);
    }
});

router.get('/verify_otp', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    const userId = req.user.id || req.session.userId;
    res.render('ACCOUNTS/verify_otp', {
        layout: 'main', userId, error: 'Invalid or expired OTP', role: user_role,
        user_name: userName
    });
})
//ACCOUNT MANAGEMENT END;

//kh start


router.get('/attractcreate', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    res.render('products_admin/attraction_creation', { layout: 'main', role: user_role, user_name: userName })
});

// Middleware to handle fetching and filtering attractions
router.get('/retrieveAttract', async (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    try {
        // Fetch all non-disabled attractions
        const allAttractions = await attractions.findAll({
            where: { disabled: false },
            order: [['location', 'ASC']],
            raw: true
        });

        res.render('products/attractionsMain', {
            layout: 'main',
            proDir: 'attractionsMain',
            attracts: allAttractions, role: user_role, user_name: userName
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Server error');
    }
});


// 1. Select * From ur attractions table 
// 2. Loop thorugh attractions
// 3. For each attraction, find it in the attarction counter table, find product_id and tday date 
// 4. If null = Create, Default Value = 100 , else skip creation
// 5. Retrieve out the data if the table have the same product_id and tday date, count if it is >=0
// 6. if = 0 , dont show the attarction

router.get('/attractions_database', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    attractions.findAll({
        order: [
            ['location', 'ASC']
        ],
        raw: true
    })
        .then((attracts) => {
            res.render('products_admin/attraction_table', {
                layout: 'main',
                attracts, role: user_role, user_name: userName
            });
        })
        .catch(err => console.log(err));
});

router.put('/disable/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const record = await attractions.findOne({ where: { id } });

        if (!record) {
            return res.status(404).send({ message: 'Record not found' });
        }

        record.disabled = true;
        await record.save();
        res.status(200).send({ message: 'Record disabled successfully' });
    } catch (error) {
        console.error('Error disabling record:', error);
        res.status(500).send({ message: 'Failed to disable the record' });
    }
});

router.put('/enable/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const record = await attractions.findOne({ where: { id } });

        if (!record) {
            return res.status(404).send({ message: 'Record not found' });
        }

        record.disabled = false;
        await record.save();
        res.status(200).send({ message: 'Record enabled successfully' });
    } catch (error) {
        console.error('Error enabling record:', error);
        res.status(500).send({ message: 'Failed to enable the record' });
    }
});


router.delete('/deleteItin/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const a = await itinerary.findOne({ where: { id } });

        if (!a) {
            return res.status(404).send({ message: 'Record not found' });
        }

        await a.destroy({ where: { id } });
        res.status(200).send({ message: 'Record deleted successfully' });
    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).send({ message: 'Failed to delete the record' });
    }
});

router.get('/book', async (req, res) => {
    try {
        const user_role = req.user.role;
        const userName = req.user.username;
        const attractionId = req.session.attractionid;
        // Fetch the attraction details from your database
        const attractionInstance = await attractions.findByPk(attractionId);

        if (!attractionInstance) {
            return res.status(404).send('Attraction not found');
        }

        // Convert Sequelize instance to a plain object
        const attraction = attractionInstance.get({ plain: true });

        // Render the booking page with the attraction details
        res.render('products/products_lists', {
            layout: 'main',
            attraction, role: user_role, user_name: userName
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.get('/weatherTracker', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    res.render('products/weatherTracker', {
        layout: 'main', role: user_role, user_name: userName
    });
});

router.get('/retrieveItinerary', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    itinerary.findAll({
        order: [
            ['date', 'ASC']
        ],
        raw: true
    })
        .then((itineraryItems) => {
            res.render('products/itineraryPlanner', {
                layout: 'main',
                itineraryItems, role: user_role, user_name: userName
            });
        })
        .catch(err => console.log(err));
});

router.get('/mapBox', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    res.render('products/mapbox', {
        layout: 'main', role: user_role, user_name: userName
    });
});
//kh end

// Kristin Start
router.get('/expensesdashboard', async (req, res) => {
    try {
        // GET MONTH AND YEAR OF CURRENT AND 4 MONTHS BEFORE THE CURRENT DATE 
        // endDate is the first day of the month
        // The startOf('month') modifies the moment object to represent the beginning of the current month
        // startDate is the first day of the month that is 4 months before the current month
        // E.g, endDate = July 1, 2024, startDate = March 1, 2024
        const user_role = req.user.role;
        const userName = req.user.username;
        const currentDate = moment();
        const endDate = currentDate.startOf('month').toDate();
        const startDate = moment(endDate).subtract(4, 'months').startOf('month').toDate();

        // FETCH ALL EXPENSES ORDERED BY DATE ASCENDING 
        // Expenses.findAll is a sequelize method that retreives all records from Expenses model
        // Ordered by transaction date in ascending order (earliest transaction first)
        const expenses = await Expenses.findAll({
            order: [['transactionDate', 'ASC']],
            raw: true
        });

        // FETCH LATEST 5 EXPENSES FROM MOST RECENT TRANSACTIONS 
        // Ordered by transaction date in descending order (latest transaction first)
        // Limit is set to 5 because I only want to show latest 5 transactions 
        const latestExpenses = await Expenses.findAll({
            order: [['transactionDate', 'DESC']],
            limit: 5,
            raw: true
        });

        // DETERMINE THE SELECTED MONTH AND YEAR 
        // req.query.month gets the selected month from the query parameter 'month' 
        // If it is not provided, it defaults to the current month and year
        const selectedMonth = req.query.month || moment().format('MMMM YYYY');
        const [monthName, year] = selectedMonth.split(' ');
        // Creates a moment object for the first day of the selected month and convert it to a Javascipt date object
        const selectedStartDate = moment(`${monthName} 1, ${year}`, 'MMMM D, YYYY').startOf('month').toDate();
        // Creates a moment object for the last day of the selected month and converts it to a Javascript date object
        const selectedEndDate = moment(selectedStartDate).endOf('month').toDate();

        // FILTERS EXPENSES FOR SELECTED MONTH 
        // Filters the expenses array to include only the expenses where the transaction date falls within the selected month's date range
        const selectedMonthExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.transactionDate);
            return expenseDate >= selectedStartDate && expenseDate <= selectedEndDate;
        });

        // CALCULATE NET CASHFLOW, MONEY IN AND MONEY OUT
        // Computes the net cashflow for the selected month
        // Adds amounts for income transactions and subtracts amount for expense transactions
        const netCashflow = selectedMonthExpenses.reduce((sum, expense) => {
            return expense.transactionType === 'income' ? sum + expense.amount : sum - expense.amount;
        }, 0);

        // Sums up amount for transactions categorised as income for the selected month 
        const moneyIn = selectedMonthExpenses
            .filter(exp => exp.transactionType === 'income')
            .reduce((sum, exp) => sum + exp.amount, 0);

        // Sums up amount for transactions categorised as expense for the selected month 
        const moneyOut = selectedMonthExpenses
            .filter(exp => exp.transactionType === 'expense')
            .reduce((sum, exp) => sum + exp.amount, 0);

        const monthlyData = calculateMonthlyData(expenses);

        // fixedCategories defines a list of expenses category
        // categorisedExpenses creates an object where each key is a category from fixedCategories
        // For each category, it calculates the total amount of expenses in that category for the selected month
        const fixedCategories = ['transfer', 'dining', 'transportation', 'shopping', 'accommodation', 'entertainment'];
        const categorizedExpenses = fixedCategories.reduce((acc, category) => {
            acc[category] = {
                category,
                amount: selectedMonthExpenses
                    .filter(expense => expense.category === category && expense.transactionType === 'expense')
                    .reduce((sum, expense) => sum + expense.amount, 0)
            };
            return acc;
        }, {});

        // Generate fixed 5 months range
        const months = getMonthsInRange(startDate, endDate);

        res.render('expenses/expensesdashboard', {
            layout: 'main',
            // JSON is a javascript method used to convert the monthlyData object into a JSON string
            // This is neccessary when you want to pass Javascript objects from the server-side to the client-side in a format that the client-side can easily parse and use
            monthlyData: JSON.stringify(monthlyData),
            moneyIn,
            moneyOut,
            netCashflow,
            categorizedExpenses: Object.values(categorizedExpenses),
            latestExpenses,
            selectedMonth,
            months, role: user_role, user_name: userName
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

function calculateMonthlyData(expenses) {
    const monthlyData = {};
    const currentDate = new Date();
    // Loop that cover the last 5 months including the current month 
    for (let i = 4; i >= 0; i--) {
        // currentDate.getFullYear() extracts the full year from currentDate object
        // E.g, if currentDate is July 25, 2024, it returns 2024
        // currentDate.getMonth() - i caluculates the the target month by subtracting i from the current month
        // currentDate.getMonth() returns month index (0 - January ... 6 - July)
        // E.g, currentDate is July 2024 (index 6)
        // When i = 3; 6 - 3 = 3 (April)
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        // Extracts the month name from the date object
        // E.g, 'January'
        const month = date.toLocaleString('default', { month: 'long' });
        // By default is 0 
        monthlyData[month] = { moneyIn: 0, moneyOut: 0 };
    }

    // Loop for each expenses in the Expenses array
    expenses.forEach(expense => {
        // expenseDate is created from the transactionDate of the Expenses
        const expenseDate = new Date(expense.transactionDate);
        // Extract the month from the expenseDate
        const month = expenseDate.toLocaleString('default', { month: 'long' });

        // This checks if the month extracted from expenseDate exists as a key in the monthlyData object
        if (monthlyData[month]) {
            // If transactons of the current expense is income, the code adds the expense.amount to the moneyIn value for that month in monthlyData
            if (expense.transactionType === 'income') {
                monthlyData[month].moneyIn += expense.amount;
                // If transactons of the current expense is NOT income, the code adds the expense.amount to the moneyOut value for that month in monthlyData
            } else if (expense.transactionType === 'expense') {
                monthlyData[month].moneyOut += expense.amount;
            }
        }
    });

    return monthlyData;
}

function getMonthsInRange(startDate, endDate) {
    const months = [];
    let currentDate = new Date(startDate);
    // This while loop continues to run as long as currentDate is less than or equal to endDate
    while (currentDate <= endDate) {
        // Fomats the currentDate as a month-year string using moment 
        // E.g, January 2024
        // push = Added to the months array
        months.push(moment(currentDate).format('MMMM YYYY'));
        // Increments the month of currentDate by 1 and sets the same day of the following month
        // E.g, currentDate is 15 January, once set it + 1 to becom 15 Febuaray 
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return months;
}

// View All Transactions Route
router.get('/viewalltransactions', async (req, res) => {
    try {
        const user_role = req.user.role;
        const userName = req.user.username;
        const expenses = await Expenses.findAll({
            order: [['transactionDate', 'ASC']],
            raw: true
        });

        const fixedCategories = ['transfer', 'dining', 'transportation', 'shopping', 'accommodation', 'entertainment'];
        const categorizedExpenses = fixedCategories.reduce((acc, category) => {
            acc[category] = {
                category,
                amount: expenses
                    // Filter out income transactions and only view category for expenses only
                    .filter(expense => expense.category === category && expense.transactionType === 'expense')
                    .reduce((sum, expense) => sum + expense.amount, 0)
            };
            return acc;
        }, {});

        res.render('expenses/viewalltransactions', {
            layout: 'main',
            expenses,
            categorizedExpenses, role: user_role, user_name: userName
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/expensesform', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    res.render('expenses/expensesform', { layout: 'main', exDir: 'expensesform', role: user_role, user_name: userName });
});

router.delete('/delete/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const expense = await Expenses.findOne({ where: { id } });

        if (!expense) {
            return res.status(404).send({ message: 'Transaction not found' });
        }

        await Expenses.destroy({ where: { id } });
        res.status(200).send({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).send({ message: 'Failed to delete the transaction' });
    }
});

router.get('/currency', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    res.render('expenses/currencyconverter', { layout: 'main', exDir: 'currencyconverter', role: user_role, user_name: userName });
});

const CURRENCY_API_KEY = 'cur_live_kWSFK5sSZ9KC9BtHuhuLBLm4yAzrBNsJiEmcJ0vc'; // Replace with your actual API key
const CURRENCY_API_URL = `https://api.currencyapi.com/v3/latest?apikey=${CURRENCY_API_KEY}&base_currency=SGD`;

router.get('/api/exchange-rates', async (req, res) => {
    try {
        const response = await axios.get(CURRENCY_API_URL);
        res.json(response.data);
        // res.render('expenses/currencyconverter', {layout: 'main', exDir: 'currencyconverter'});
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
});

router.get('/budgetform', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    res.render('budget/budgetform', { layout: 'main', budDir: 'budgetform', role: user_role, user_name: userName });
});

router.get('/budgetdashboard', async (req, res) => {
    try {
        const user_role = req.user.role;
        const userName = req.user.username;
        const budgets = await Budget.findAll({
            where: { userId: req.user.id }, // Assume userId is stored in session
            order: [['category', 'ASC']],
            raw: true
        });

        // Calculate total spent for each budget category
        const updatedBudgets = budgets.map(budget => {
            const totalSpent = parseFloat(budget.totalSpent) || 0; // Make sure totalSpent is a number
            const amount = parseFloat(budget.amount);
            const remainingAmount = amount - totalSpent;
            console.log('remainingAmount', remainingAmount);
            const progress = amount > 0 ? (totalSpent / amount) * 100 : 0;

            return {
                ...budget,
                totalSpent: totalSpent.toFixed(2),
                remainingAmount: remainingAmount.toFixed(2),
                progress: progress.toFixed(2)
            };
        });
        console.log('updatedBuidget: ', updatedBudgets)

        res.render('budget/budgetdashboard', {
            layout: 'main',
            budget: updatedBudgets, role: user_role, user_name: userName
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.delete('/deleteBudget/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const budget = await Budget.findOne({ where: { id } });

        if (!budget) {
            return res.status(404).send({ message: 'Budget not found' });
        }

        await Budget.destroy({ where: { id } });
        res.status(200).send({ message: 'Budget deleted successfully' });
    } catch (error) {
        console.error('Error deleting budget:', error);
        res.status(500).send({ message: 'Failed to delete the budget' });
    }
});

router.get('/predictivebudget', async (req, res) => {
    try {
        const userId = req.user.id;;

        // Aggregate expenses by category and calculate the average
        const expenses = await Expenses.findAll({
            where: { userId, transactionType: 'expense' },
            // Calculate the average amount
            attributes: ['category', [Sequelize.fn('AVG', Sequelize.col('amount')), 'averageAmount']],
            // Group results by category
            group: ['category']
        });

        const categoryAverages = {};
        expenses.forEach(expense => {
            categoryAverages[expense.category] = expense.get('averageAmount');
        });

        res.json(categoryAverages);
    } catch (error) {
        console.error('Error fetching predictive budget:', error);
        res.status(500).send('Internal Server Error');
    }
});
// Kristin End 

//Icyau05 start
// Function to generate QR codes
async function generateQRCode(ticketId) {
    try {
        const qrCodeData = await QRCode.toDataURL(`http://localhost:3000/redeem?ticketId=${ticketId}`);
        return qrCodeData;
    } catch (err) {
        console.error('Error generating QR code:', err);
        throw err;
    }
}

router.get('/purchaseDetails', async (req, res) => {
    try {
        const userId = req.user.id;
        const user_role = req.user.role;
        const userName = req.user.username;
        const currentDate = new Date(); // Get the current date

        // Initialize query conditions based on role
        const cartQuery = user_role === 'Admin' ? { status: 'Paid' } : { userId: userId, status: 'Paid' };

        // Fetch all cart items for the user
        const userCart = await Cart.findAll({
            where: cartQuery,
            raw: true
        });
        // Extract the attractionIDs from the cart items
        const attractionIds = userCart.map(item => item.attractionId);
        console.log('attractionIds:', attractionIds);
        // Fetch details of each attraction
        const attractionsList = await attractions.findAll({
            where: {
                id: attractionIds
            },
            raw: true
        });
        console.log('Attractions:', attractionsList);
        // Step 4: Combine cart items and their corresponding attraction details
        const cartWithAttractions = userCart.map(cartItem => {
            const attraction = attractionsList.find(attraction => attraction.id === cartItem.attractionId);
            return {
                ...cartItem,
                attraction
            };
        });

        // Split into upcoming and past attractions
        const upcomingAttractions = cartWithAttractions.filter(cartItem => new Date(cartItem.dateOfAttraction) >= currentDate);
        const pastAttractions = cartWithAttractions.filter(cartItem => new Date(cartItem.dateOfAttraction) < currentDate);

        res.render('payment_cs/purchase_details', {
            upcomingAttractions,
            pastAttractions,
            layout: 'dashboard', role: user_role, user_name: userName
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Error fetching data');
    }
});

router.get('/cart', async (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    try {
        await updateCostOfAttraction();
        const userId = req.user.id;
        // Fetch all cart items for the user
        const userCart = await Cart.findAll({
            where: { userId: userId, status: 'Cart' },
            raw: true
        });
        // Extract the attractionIDs from the cart items
        const attractionIds = userCart.map(item => item.attractionId);
        console.log('attractionIds:', attractionIds);
        // Fetch details of each attraction
        const attractionsList = await attractions.findAll({
            where: {
                id: attractionIds
            },
            raw: true
        });
        console.log('Attractions:', attractionsList);
        // Step 4: Combine cart items and their corresponding attraction details
        const cartWithAttractions = userCart.map(cartItem => {
            const attraction = attractionsList.find(attraction => attraction.id === cartItem.attractionId);
            return {
                ...cartItem,
                attraction
            };
        });

        // Calculate the total cost of attractions
        const totalCost = userCart.reduce((sum, cartItem) => sum + parseFloat(cartItem.costOfAttraction), 0).toFixed(2);
        const totaltotal = (parseFloat(totalCost) + 2).toFixed(2);
        // Store the total cost in the session
        req.session.totalCost = totalCost;
        console.log('plusbooking: ', req.session.totalCost)

        const includegst = ((totalCost + 2) * 0.09).toFixed(2)

        res.render('payment_cs/cart', {
            userCart: cartWithAttractions,
            totalCost: totalCost,
            totaltotal: totaltotal,
            includegst: includegst,
            layout: 'main', role: user_role, user_name: userName
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Error fetching data');
    }
});

router.get('/checkout', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    res.render('payment_cs/checkout', { layout: 'main', nationalities: nationalities, role: user_role, user_name: userName });
});

router.get('/payment', (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    res.render('payment_cs/payment', { layout: 'main', role: user_role, user_name: userName });
});

router.get('/paymentsuccess', async (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    res.render('payment_cs/payment_success', { layout: 'main', role: user_role, user_name: userName });
});

router.get('/reviewsuccess', async (req, res) => {
    const user_role = req.user.role;
    const userName = req.user.username;
    res.render('payment_cs/reviewsuccess', { layout: 'main', role: user_role, user_name: userName });
});

router.get('/review', async (req, res) => {
    try {
        const user_role = req.user.role;
        const userName = req.user.username;
        const userId = req.user.id;
        const invoiceid = req.session.invoiceid;
        const attractionid = req.session.attractionid;
        // Fetch all cart items for the user
        const cart = await Cart.findOne({
            where: { status: 'Paid', invoiceid: invoiceid, attractionId: attractionid },
            raw: true
        });

        const attraction = await attractions.findOne({
            where: {
                id: attractionid
            },
            raw: true
        });

        const user = await User.findOne({
            where: {
                id: userId
            },
            raw: true
        })

        // Fetch the review if it exists
        const review = await Review.findOne({
            where: { invoiceId: invoiceid, attractionId: attractionid },
            raw: true
        });
        console.log('review', review);

        res.render('payment_cs/review', {
            layout: 'main', role: user_role, user_name: userName, attraction: attraction, cart: cart, user: user, review: review
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Error fetching data');
    }
});

router.get('/invoice', async (req, res) => {
    try {
        const user_role = req.user.role;
        const userName = req.user.username;
        const userId = req.user.id;
        const checkInvoice = req.session.checkinvoice;
        console.log('checkinvoice is', checkInvoice);

        // Define the query based on user role
        const cartQuery = user_role === 'Admin' ? { status: 'Paid', invoiceid: checkInvoice } : { userId: userId, status: 'Paid', invoiceid: checkInvoice };
        const visitorQuery = user_role === 'Admin' ? { invoiceid: checkInvoice } : { userId: userId, invoiceid: checkInvoice };

        // Fetch all cart items for the user
        const userCart = await Cart.findAll({
            where: cartQuery,
            raw: true
        });
        // Extract the attractionIDs from the cart items
        const attractionIds = userCart.map(item => item.attractionId);
        console.log('attractionIds:', attractionIds);
        // Fetch details of each attraction
        const attractionsList = await attractions.findAll({
            where: {
                id: attractionIds
            },
            raw: true
        });
        const visitor = await Visitor.findOne({
            where: visitorQuery,
            raw: true
        });
        console.log('Attractions:', attractionsList);
        // Step 4: Combine cart items and their corresponding attraction details
        const cartWithAttractions = userCart.map(cartItem => {
            const attraction = attractionsList.find(attraction => attraction.id === cartItem.attractionId);
            return {
                ...cartItem,
                attraction
            };
        });

        // Calculate the total cost of attractions
        const totalCost = userCart.reduce((sum, cartItem) => sum + parseFloat(cartItem.costOfAttraction), 0).toFixed(2);
        const totaltotal = (parseFloat(totalCost) + 2).toFixed(2);
        // Store the total cost in the session

        const includegst = ((totalCost + 2) * 0.09).toFixed(2)

        res.render('payment_cs/invoice', {
            userCart: cartWithAttractions,
            visitor: visitor,
            totalCost: totalCost,
            totaltotal: totaltotal,
            includegst: includegst,
            layout: 'main', role: user_role, user_name: userName
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Error fetching data');
    }
});

router.get('/tickets', async (req, res) => {
    try {
        const user_role = req.user.role;
        const userName = req.user.username;
        const userId = req.user.id;
        const invoiceid = req.session.invoiceid;
        const attractionid = req.session.attractionid;
        // Fetch all cart items for the user
        const cart = await Cart.findOne({
            where: { status: 'Paid', invoiceid: invoiceid, attractionId: attractionid },
            raw: true
        });

        const attraction = await attractions.findOne({
            where: {
                id: attractionid
            },
            raw: true
        });

        const ticketsFromDB = await Ticket.findAll({
            where: {
                cartId: cart.id,
                attractionId: attractionid
            },
            raw: true
        });

        // Prepare tickets array
        const tickets = [];

        for (const ticket of ticketsFromDB) {
            const qrCode = await generateQRCode(ticket.id);
            ticket.qrCode = qrCode;
            let description = '';
            if (ticket.type === 'Adult') {
                description = '1 x General Admission - Adult (13 years old and above)';
            } else if (ticket.type === 'Child') {
                description = '1 x General Admission - Child (12 years old and below)';
            }
            tickets.push({
                type: ticket.type,
                description: description,
                qrCode: qrCode,
                ticketId: ticket.id,
                redeemed: ticket.redeemed
            });
        }

        res.render('payment_cs/tickets', {
            layout: 'main', role: user_role, user_name: userName, tickets: tickets, attraction: attraction, cart: cart
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Error fetching data');
    }
})

router.get('/redeem', async (req, res) => {
    const ticketId = req.query.ticketId;

    try {
        // Find the ticket by its ID
        const ticket = await Ticket.findOne({ where: { id: ticketId } });

        if (!ticket) {
            return res.status(404).send('Ticket not found');
        }

        if (ticket.redeemed) {
            return res.status(400).send('Ticket already redeemed');
        }

        // Mark the ticket as redeemed
        ticket.redeemed = true;
        await ticket.save();

        res.send('Ticket redeemed successfully');
    } catch (err) {
        console.error('Error redeeming ticket:', err);
        res.status(500).send('Error redeeming ticket');
    }
});

router.get('/sales-data', async (req, res) => {
    try {
        const salesData = await Visitor.findAll({
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
                [Sequelize.fn('SUM', Sequelize.col('subtotal')), 'totalSales']
            ],
            group: ['date'],
            order: [['date', 'ASC']],
            raw: true // Convert results to plain objects
        });

        const dates = salesData.map(data => data.date);
        const totals = salesData.map(data => data.totalSales);

        res.json({ dates, totals });
    } catch (error) {
        console.error('Error fetching sales data:', error);
        res.status(500).json({ error: 'Error fetching sales data' });
    }
});
//Icyau05 end

module.exports = router;