const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const { Cart, updateCostOfAttraction } = require('../models/Cart');
const Visitor = require('../models/Visitor');
const attractions = require('../models/Attraction');
const AttractionCounter = require('../models/AttractionCounter');
const Ticket = require('../models/Ticket');
const Review = require('../models/Review');
router.use(bodyParser.urlencoded({ extended: true })); //use the body-parser to parseencoded url data
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');
const { sendEmail } = require('../helpers/emailService'); // Import the email service

// Function to generate a unique UUID
async function generateUniqueUUID() {
    let unique = false;
    let uuid = '';

    while (!unique) {
        uuid = uuidv4();
        const count = await Visitor.count({ where: { invoiceid: uuid } });
        if (count === 0) {
            unique = true;
        }
    }

    return uuid;
}

function generateRandomTicketId() {
    return Math.floor(Math.random() * 90000000) + 10000000; // Generates a random number between 10000000 and 99999999
}

async function getUniqueTicketId() {
    let unique = false;
    let ticketId;

    while (!unique) {
        ticketId = generateRandomTicketId().toString();
        const existingTicket = await Ticket.findOne({ where: { id: ticketId } });
        if (!existingTicket) {
            unique = true;
        }
    }

    return ticketId;
}

// Function to read and compile the Handlebars template
const compileTemplate = (templateName, data) => {
    const filePath = path.join(__dirname, '..', 'views', 'admin', `${templateName}.hbs`);
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    return template(data);
};

router.post('/viewReceipt', (req, res) => {
    const { invoiceid } = req.body;
    req.session.checkinvoice = invoiceid;
    console.log('invoice is smt: ', invoiceid);
    res.redirect('/invoice');
});

router.post('/viewTicket', (req, res) => {
    const { invoiceid, attractionid } = req.body;
    req.session.invoiceid = invoiceid;
    req.session.attractionid = attractionid;
    console.log('invoice is smt: ', invoiceid);
    console.log('attractionid is smt: ', attractionid);
    res.redirect('/tickets');
});

router.post('/leaveReview', (req, res) => {
    const { invoiceid, attractionid } = req.body;
    req.session.invoiceid = invoiceid;
    req.session.attractionid = attractionid;
    console.log('invoice is smt: ', invoiceid);
    console.log('attractionid is smt: ', attractionid);
    res.redirect('/review');
});

router.post('/addCart', async (req, res) => {
    const { attractionId, dateOfAttraction, adultQuantity, childQuantity } = req.body;
    console.log('attractionId: ', attractionId);
    console.log('dateOfAttraction: ', dateOfAttraction);
    console.log('adultQuantity: ', adultQuantity);
    console.log('adultQuantity: ', adultQuantity);
    const userId = req.user.id; // Assuming userId is stored in session
    const totalTickets = parseInt(adultQuantity, 10) + parseInt(childQuantity, 10);
    try {
        const existingcounter = await AttractionCounter.findOne({
            where: {
                attractionid: attractionId,
                day: dateOfAttraction
            }
        });

        if (existingcounter) {
            // Create the record if it does not exist
            const newCount = existingcounter.count + totalTickets;
            if (newCount > 100) {
                console.error('Exceeded maximum ticket limit');
                return res.status(400).send(`
                    <script>
                        alert('Exceeded maximum ticket limit. Only ${ticketsLeft} tickets left for this day.');
                        window.location.href = '/book'; // Redirect back to booking page
                    </script>
                `);
            }
            await existingcounter.update({
                count: newCount
            });
        } else {
            if (totalTickets > 100) {
                console.error('Exceeded maximum ticket limit');
                return res.status(400).send(`
                    <script>
                        alert('Exceeded maximum ticket limit. Only 100 tickets available for this day.');
                        window.location.href = '/book'; // Redirect back to booking page
                    </script>
                `);
            }
            await AttractionCounter.create({
                attractionid: attractionId,
                day: dateOfAttraction,
                count: totalTickets
            });
        }

        if (userId) {
            // Check if a record already exists for this userId
            const existingRecord = await Cart.findOne({
                where: { userId: userId, attractionid: attractionId, status: 'Cart' }
            });

            if (existingRecord) {
                // Update the existing record with new data
                await existingRecord.update({
                    dateOfAttraction: dateOfAttraction,
                    noOfAdults: adultQuantity,
                    noOfChild: childQuantity
                });

                console.log('Record updated successfully');
                res.redirect('/cart'); // Redirect to a success page or another route
            } else {
                // Create a new record since none exists
                const addtocart = await Cart.create({
                    dateOfAttraction: dateOfAttraction,
                    noOfAdults: adultQuantity,
                    noOfChild: childQuantity,
                    userId: userId,
                    attractionId: attractionId
                });

                console.log('New record created successfully');
                res.redirect('/cart'); // Redirect to a success page or another route
            }
        } else {
            console.error('User not authenticated');
            res.status(401).send('User not authenticated');
        }
    } catch (error) {
        console.error('Error updating/creating record:', error);
        res.status(500).send('Error updating/creating record');
    }
});

router.post('/delete', async (req, res) => {
    try {
        const { attractionId } = req.body;
        const userId = req.user.id;

        // Delete the rows where userId matches the current user, attractionId matches, and status is 'Cart'
        await Cart.destroy({
            where: {
                userId: userId,
                attractionId: attractionId,
                status: 'Cart'
            }
        });

        res.status(200).send({ message: 'Attraction deleted successfully' });
    } catch (err) {
        console.error('Error deleting attraction:', err);
        res.status(500).send({ error: 'Failed to delete attraction' });
    }
});

router.post('/visitform', async (req, res) => {
    const userId = req.user.id;
    const subtotal = req.session.totalCost;
    try {
        // Retrieve form data
        const fullName = req.body.fullName;
        const email = req.body.email;
        const phone = req.body.phone;
        const DOB = req.body.DOB;
        const nationality = req.body.nationality;
        const consentMarketing = req.body.consentMarketing;
        const countryCode = req.body.countryCode;
        const isoCode = req.body.isoCode;

        console.log('dob: ', DOB);
        console.log('email: ', email);
        req.session.sendEmail = email;

        if (userId) {
            // Check if a record already exists for this userId
            const existingRecord = await Visitor.findOne({
                where: {
                    userId: userId,
                    cardName: null
                }
            });

            if (existingRecord) {
                // Update the existing record with new data
                await existingRecord.update({
                    fullName,
                    email,
                    phone,
                    DOB,
                    nationality,
                    countryCode,
                    isoCode,
                    consentMarketing: consentMarketing === 'on', // Convert to boolean if necessary
                    subtotal: subtotal,
                    userId: userId
                });

                console.log('Record updated successfully');
                res.redirect('/payment'); // Redirect to a success page or another route
            } else {
                // Create a new record since none exists
                const newRecord = await Visitor.create({
                    fullName,
                    email,
                    phone,
                    DOB,
                    nationality,
                    countryCode,
                    isoCode,
                    consentMarketing: consentMarketing === 'on', // Convert to boolean if necessary
                    subtotal: subtotal,
                    userId: userId

                });

                console.log('New record created successfully');
                res.redirect('/payment'); // Redirect to a success page or another route
            }
        } else {
            console.error('User not authenticated');
            res.status(401).send('User not authenticated');
        }
    } catch (error) {
        console.error('Error saving visitor information:', error);
        res.status(500).send('Error saving visitor information'); // Handle errors
    }
});

router.post('/submitPayment', async (req, res) => {
    const formData = req.body;
    const userId = req.user.id; // Assuming userId is stored in session
    const email = req.session.sendEmail;
    console.log('email sending to: ', email);
    try {
        // Generate a single unique UUID for this transaction
        const invoiceId = await generateUniqueUUID();

        const updatevisitor = await Visitor.update(
            {
                cardName: formData.cardName,
                cardType: formData.cardType,
                cardNo: formData.cardNo,
                cardExp: formData.expDate,
                invoiceid: invoiceId
            },
            {
                where: {
                    userId: userId,
                    cardName: null
                }
            }
        );
        const updateCart = await Cart.update(
            {
                cardName: formData.cardName,
                cardType: formData.cardType,
                cardNo: formData.cardNo,
                cardExp: formData.expDate,
                invoiceid: invoiceId,
                status: 'Paid'
            },
            {
                where: {
                    userId: userId,
                    invoiceid: null,
                    status: 'Cart'
                }
            }
        );
        // Fetch all cart items for the user
        const userCart = await Cart.findAll({
            where: { userId: userId, status: 'Paid', invoiceid: invoiceId },
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
            where: {
                userId: userId, invoiceid: invoiceId
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

        const includegst = ((totalCost + 2) * 0.09).toFixed(2)
        // Prepare the email body using the compiled template
        const emailBody = compileTemplate('invoiceEmail', {
            userCart: cartWithAttractions,
            visitor: visitor,
            totalCost: totalCost,
            totaltotal: totaltotal,
            includegst: includegst,
        });

        // Send the email
        sendEmail({
            to: 'nathalielichengyau@gmail.com',
            subject: 'JourneyJunction - Payment Successful',
            body: emailBody,
            isHtml: true // Ensure the email is sent as HTML
        });

        for (const cartItem of userCart) {
            const attraction = attractionsList.find(attraction => attraction.id === cartItem.attractionId);

            if (cartItem.noOfAdults > 0) {
                for (let i = 0; i < cartItem.noOfAdults; i++) {
                    const ticketId = await getUniqueTicketId();
                    const ticket = await Ticket.create({ id: ticketId, type: 'Adult', cartId: cartItem.id, userId: userId, attractionId: attraction.id });
                }
            }

            if (cartItem.noOfChild > 0) {
                for (let i = 0; i < cartItem.noOfChild; i++) {
                    const ticketId = await getUniqueTicketId();
                    const ticket = await Ticket.create({ id: ticketId, type: 'Child', cartId: cartItem.id, userId: userId, attractionId: attraction.id });
                }
            }
        }
        res.json({ success: true, redirectUrl: '/paymentsuccess' });
    } catch (error) {
        console.error('Error saving form data:', error);
        res.status(500).json({ message: 'Failed to process form data' });
    }
});

router.post('/submitReview', async (req, res) => {

    const { firstName, lastName, email, description, rating, attractionid, invoiceid } = req.body;
    const userId = req.user.id; // Assuming userId is stored in session
    console.log('Form data:', req.body); // Add this line
    console.log('firstname: ', firstName);
    console.log('rating: ', rating);
    console.log('attractionid: ', attractionid);
    console.log('invoiceid: ', invoiceid);

    try {
        // Check if a review already exists
        let review = await Review.findOne({
            where: {
                userId: userId,
                invoiceId: invoiceid,
                attractionId: attractionid
            }
        });

        if (review) {
            // Update the existing review
            review = await review.update({
                first_name: firstName,
                last_name: lastName,
                email: email,
                feedback: description,
                rating: rating
            });
        } else {
            // Create a new review
            review = await Review.create({
                first_name: firstName,
                last_name: lastName,
                email: email,
                feedback: description,
                rating: rating,
                invoiceId: invoiceid,
                attractionId: attractionid,
                userId: userId
            });
        }

        // Redirect to success page
        res.redirect('/reviewsuccess');
    } catch (err) {
        console.error('Error while submitting claim:', err);
        res.status(500).send('Server error');
    }
});

module.exports = router;