const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const moment = require('moment');
const attractions = require('../models/Attraction');
const AttractionCounter = require('../models/AttractionCounter');


const cookieParser = require('cookie-parser');

router.use(cookieParser());

const checkTicketAvailability = async (req, res, next) => {
    const { attractionId, dateOfAttraction, adultQuantity, childQuantity } = req.body;
    const totalTicketsRequested = parseInt(adultQuantity) + parseInt(childQuantity);

    try {
        let record = await AttractionCounter.findOne({
            where: {
                attractionid: attractionId,
                day: dateOfAttraction
            }
        });

        if (record) {
            const totalTicketsSold = record.count;
            const totalTicketsAfterBooking = totalTicketsSold + totalTicketsRequested;

            if (totalTicketsAfterBooking > 100) {
                req.flash('error_msg', 'Total tickets for the selected date have exceeded the limit.');
                return res.redirect('back');
            }
        } else if (totalTicketsRequested > 100) {
            req.flash('error_msg', 'Total tickets for the selected date have exceeded the limit.');
            return res.redirect('back');
        }

        // If the limit is not exceeded, proceed to the next middleware
        next();
    } catch (error) {
        console.error('Error checking ticket availability:', error);
        req.flash('error_msg', 'An error occurred while checking ticket availability.');
        res.redirect('back');
    }
};

// Method to update or create a counter record
AttractionCounter.incrementCount = async (attractionId, day, count) => {
    const [record, created] = await AttractionCounter.findOrCreate({
        where: {
            attractionid: attractionId,
            day: day
        },
        defaults: {
            count: count
        }
    });

    if (!created) {
        // Increment the count if the record already exists
        record.count += count;
        await record.save();
    }

    return record;
};

router.post('/submission', (req,res) => 
{
    let {location, priceadult, pricechild, image_path} = req.body;
    attractions.create({location, priceadult, pricechild, image_path}
    )
});

router.post('/booking', async (req, res) => {
    const { attractionId } = req.body;
    req.session.attractionid = attractionId;
    console.log('invoice is smt: ',attractionId);
    
    res.redirect('/book');
});

// POST route to UPDATE an attraction
router.post('/updateAttraction', async (req, res) => {
    try {
        const { id, location, priceadult, pricechild, image_path } = req.body;
        
        const [updatedRows] = await attractions.update(
            { location, priceadult, pricechild, image_path },
            { where: { id: id } }
        );

        if (updatedRows > 0) {
            res.redirect('/attractions_database');
        } else {
            res.status(404).send('Attraction not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

module.exports = router;