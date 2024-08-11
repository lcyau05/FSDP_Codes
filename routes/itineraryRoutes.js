const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const moment = require('moment');
const itinerary = require('../models/Itinerary');
const { sendEmail } = require('../helpers/emailService');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const cookieParser = require('cookie-parser');

router.use(cookieParser());

const compileTemplate = (templateName, data) => {
  const filePath = path.join(__dirname, '..', 'views', 'admin', `${templateName}.hbs`);
  const source = fs.readFileSync(filePath, 'utf-8').toString();
  const template = handlebars.compile(source);
  return template(data);
};

router.post('/add', (req,res) => 
    {
        let {date, activity, location, time} = req.body;
        itinerary.create({date, activity, location, time}
        )
        res.redirect('/retrieveItinerary');
    });

// POST route to UPDATE an attraction
router.post('/updateItinerary', async (req, res) => {
    try {
        const { id, date, time, activity, location } = req.body;
        
        const [updatedRows] = await itinerary.update(
            { date, time, activity, location },
            { where: { id: id } }
        );

        if (updatedRows > 0) {
            res.redirect('/retrieveItinerary');
        } else {
            res.status(404).send('Attraction not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Function to fetch itinerary data from the database
const getItinerary = async () => {
    const itineraries = await itinerary.findAll({
      order: [['date', 'ASC']],
    });
    console.log(itineraries); // Log the fetched data
    return itineraries;
  };

// Route to send the itinerary email
router.post('/send-itinerary-email', async (req, res) => {
    const { email } = req.body;
  
    try {
      const itinerary = await getItinerary();
  
      // Map Sequelize results to plain objects
      const itineraryItems = itinerary.map(item => item.get({ plain: true }));
  
      // Ensure the path is correct
      // const templateSource = fs.readFileSync(path.join(__dirname, '../views/products/sendItineraryEmail.hbs'), 'utf8');
      // const template = Handlebars.compile(templateSource);
      // const html = template({ itineraryItems });

      const emailBody = compileTemplate('sendItineraryEmail', {
        itineraryItems
      });

      sendEmail({
        // to: 'n.kahhau2111@gmail.com',
        to: email,
        subject: 'Your Itinerary',
        body: emailBody,
        isHtml: true // Ensure the email is sent as HTML
      });
  
      res.status(200).json({ message: 'Itinerary email sent successfully' });
    } catch (error) {
      console.error('Error sending itinerary email:', error);
      res.status(500).json({ message: 'Failed to send itinerary email' });
    }
  });

module.exports = router;