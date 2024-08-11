const express = require('express') //importing the express library for use
const app = express() //initialise the express class with a variable name app
const bodyParser = require('body-parser'); //import body-parser to use and named it as bodyParser
const exphbs = require('express-handlebars'); //importing the express handlebars
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const path = require('path');
const handlebars = require('handlebars');
const db = require('./config/db');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require('bcryptjs'); //for password encryption
const passport = require('passport');
const journeyjunctionDB = require('./config/DBConnection'); //bring in database connection
const methodOverride = require('method-override');
const { formatDate, customHandlebars } = require('./helpers/hbs');
const User = require('./models/User');
const { Cart, updateCostOfAttraction } = require('./models/Cart');
const Attraction = require('./models/Attraction');
const mainRoute = require('./routes/main');
const userRoute = require('./routes/user_routes');
const attractRoute = require('./routes/attractRoutes');
const intinRoute = require('./routes/itineraryRoutes');
const cartpayRoute = require('./routes/cartpay_routes');
const expensesRoute = require('./routes/expenses_routes');
const budgetRoute = require('./routes/budget_routes');
const email_notification = require('./models/Email_notification');
const dialogflow = require('@google-cloud/dialogflow');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const http = require('http');
const ngrok = require('@ngrok/ngrok');
const multer = require('multer');
require('./helpers/cronJobs');
const { sendEmail } = require('./helpers/emailService'); // Import the email service
//connects to MySQL database
journeyjunctionDB.setUpDB(false); //To set up database with new tables set (true)

//passport config
const authenticate = require('./config/passport')
authenticate.localStrategy(passport);

app.use(bodyParser.json()); //use the body-parser to parse json data

app.post('/webhook', async (req, res) => {
    console.log('Webhook endpoint hit');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    try {
        const sessionId = uuidv4();
        const projectId = 'journeyjunction-mkxt'; // Replace with your Dialogflow project ID
        const sessionClient = new dialogflow.SessionsClient();
        const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

        const intentName = req.body.queryResult.intent.displayName;
        // Extract userId and invoiceId from Dialogflow parameters
        const parameters = req.body.queryResult.parameters;
        const userId = parameters.UserID;
        const invoiceId = parameters.InvoiceID;

        if (!userId || !invoiceId) {
            return res.json({
                fulfillmentText: 'User ID or Invoice ID is not available. Please provide both your user ID and invoice ID.'
            });
        }

        if (intentName === 'CheckPurchaseDetails') {
            // Get cart data using Sequelize
            const cartItems = await Cart.findAll({
                where: { userId: userId, status: 'Paid', invoiceid: invoiceId },
                raw: true
            });
            console.log('cart is', cartItems);
            // Extract all attractionIds from cartItems
            const attractionIds = cartItems.map(item => item.attractionId);

            // Get attraction data for the extracted attractionIds
            const attractions = await Attraction.findAll({
                where: {
                    id: attractionIds
                },
                raw: true
            });

            // Create a mapping of attractionId to attraction data
            const cartWithAttractions = cartItems.map(cartItem => {
                const attraction = attractions.find(attraction => attraction.id === cartItem.attractionId);
                return {
                    ...cartItem,
                    attractionName: attraction ? attraction.location : null, // Example field
                    // attractionDescription: attraction ? attraction.description : null // Add any other fields you need
                };
            });
            // Generate response text from cart data
            let responseText = 'Here are your past purchases: ';
            cartWithAttractions.forEach((item, index) => {
                responseText += `\n\nAttraction: ${item.attractionName}\nDate: ${item.dateOfAttraction}\n`;
            });

            return res.json({
                fulfillmentText: responseText
            });
        } else {
            return res.json({
                fulfillmentText: 'Unknown intent.'
            });
        }
    } catch (error) {
        console.error('Error handling webhook:', error);
        return res.json({
            fulfillmentText: 'There was an error processing your request.'
        });
    }
});

app.use(bodyParser.urlencoded({ extended: true })); //use the body-parser to parseencoded url data

//enables session to be stored using browser's cookie ID
app.use(cookieParser());

app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
    handlebars: customHandlebars,
    helpers: {
        formatDate: formatDate,
        json: customHandlebars.helpers.json // Register the json helper
    },
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
    },
}));

app.set('view engine', 'hbs');


// Creates static folder for publicly accessible HTML, CSS and Javascript files
app.use(express.static(path.join(__dirname, 'public')));

// Session Store Configuration
const sessionStoreOptions = {
    host: db.host,
    port: db.port,
    user: db.username,
    password: db.password,
    database: db.database,
    clearExpired: true,
    //how frequently expired sessions will be cleared; milliseconds:
    checkExpirationalInterval: 900000,
    //the maximum age of a valid session; milliseconds:
    expiration: 900000
};
const sessionStore = new MySQLStore(sessionStoreOptions);

// Session Middleware
app.use(session({
    key: 'session_cookie_name',
    secret: 'session_cookie_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false
}));

//initiate passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash Messages Middleware
app.use(flash());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/img/');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  });

const upload = multer({ storage: storage });

//Method override middleware to use other HTTP methodsd such as PUT and DELETE
app.use(methodOverride('_method'));

// Middleware to set user object in response locals
app.use((req, res, next) => {
    console.log('Middleware running');
    console.log('User:', req.user);
    console.log('Role:', req.session.role);
    res.locals.success_messages = req.flash('success');
    res.locals.error_messages = req.flash('error');
    res.locals.user = req.user || null; // Ensure user data is available in views
    res.locals.role = req.session.role || null; // Ensure role data is available in views
    next();
});

//mainRoute is declared to point to routes/main.js
app.use('/', mainRoute);
app.use('/user', userRoute); //userRoute is declared to point to routes/user_routes.js
app.use('/attractions', attractRoute);
app.use('/itinerary', intinRoute);
app.use('/expenses', expensesRoute);
app.use('/budget', budgetRoute);
app.use('/paycs', cartpayRoute);

// Function to read and compile the Handlebars template
const compileTemplate = (templateName, data) => {
    const filePath = path.join(__dirname, 'views', 'admin', `${templateName}.hbs`);
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.compile(source);
    return template(data);
};

// ======== Navigation =============== 
// app.get('/', (req, res) => {
//     // const userEmail = "nathalielichengyau@gmail.com";
//     // console.log('email: ' + userEmail);
//     // sendEmail({
//     //     to: userEmail,
//     //     subject: 'Your subscription has been canceled',
//     //     body: `Hi there, your subscription has been canceled. If this was a mistake, please contact our support team.`,
//     // });
//     res.render('index', { layout: 'main' });
// });

app.get('/about', (req, res) => {
    res.render('about', { layout: 'main' });
});

app.get('/booking', (req, res) => {
    res.render('booking', { layout: 'main' });
});

app.get('/service', (req, res) => {
    res.render('service', { layout: 'main' });
});

app.get('/destination', (req, res) => {
    res.render('destination', { layout: 'main' });
});

app.get('/contact', (req, res) => {
    res.render('contact', { layout: 'main' });
});

app.get('/package', (req, res) => {
    res.render('package', { layout: 'main' });
});

app.get('/team', (req, res) => {
    res.render('team', { layout: 'main' });
});

app.get('/testimonial', (req, res) => {
    res.render('testimonial', { layout: 'main' });
});

app.get('/404', (req, res) => {
    res.render('404', { layout: 'main' });
});

//ACCOUNT
app.post('/email_notifications', upload.single('attachment'), async (req, res) => {
    
    const { email_title, email_content } = req.body;
    const attachment = req.file;

    try {
        // Save email notification to the database
        const emailNotification = await email_notification.create({
            email_title,
            email_content,
            attachment_filename: attachment ? attachment.filename : null,
            attachment_path: attachment ? attachment.path : null
        });
        console.log('Email notification saved to database');

        // Get all users
        const users = await User.findAll();
        console.log('Users retrieved:', users.length);
        // Prepare attachments array if it exists
        const attachments = attachment ? [{
            filename: attachment.filename,
            path: attachment.path
        }] : [];

        // Send email to all users
        for (const user of users) {
            await sendEmail({
                to: user.email,
                subject: `JourneyJunction - ${email_title}`,
                body: email_content,
                isHtml: false, // Set to true if email_content is HTML
                attachments: attachments
            });
            console.log(`Email sent to: ${user.email}`);
        }
                // Set success message
                req.flash('success_msg', 'Emails sent successfully!');
                // Redirect to email_notifications page after emails are sent
                res.redirect('/email_notifications');
    } catch (error) {
        console.log(error);
        req.flash('error_msg', 'An error occurred.');
        res.redirect('/email_notifications');
    }
});

app.get('/user_audit', (req, res) => {
    const user_role = req.user ? req.user.role : req.user.role || null; // Retrieve role from user or session
    const user_name = req.user ? req.user.first_name : req.session.first_name || null; // Retrieve role from user or session
    console.log("in user_routes.js /user_audit");

    session_login.findAll({
        order: [
            ['login_time', 'ASC'] // Order by login_time descending
        ],
        raw: true,
    })
        .then(sessionLogins => {
            session.login_time = moment(session.login_time).format('DD-MM-YYYY HH:mm:ss');
            if (session.logout_time) {
                session.logout_time = moment(session.logout_time).format('DD-MM-YYYY HH:mm:ss');
            }
            // Render the user-audit.handlebars view, passing in session login data
            res.render('ACCOUNTS/user_audit', {
                layout: 'main',
                role: user_role,
                first_name: user_name,
                sessionLogins: sessionLogins,
            });
        })
        .catch(err => console.log(err));
});
app.post('/sign_up', (req, res) => {
    // Assuming date_of_birth is in 'YYYY-MM-DD' format
    const today = new Date();
    const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());

    let errorsList = [];

    let { user_name, email, password, travel_doc_id,
        DOB, gender, phone_no, postal_code, address, confirm_password } = req.body;

    // Check if first name is provided
    if (!user_name || user_name.length <= 0) {
        errorsList.push({ text: 'Please enter your Username!' });
    }
    // Check if travelDocId is provided
    if (!travel_doc_id || travel_doc_id.length <= 0) {
        errorsList.push({ text: 'Please enter your Travel Document ID!' });
    } else if (!/^[A-Za-z0-9]*[A-Za-z]$/.test(travel_doc_id)) {
        errorsList.push({ text: 'Travel Document ID must end with an alphabet!' });
    }

    // Check date_of_birth
    if (!DOB) {
        errorsList.push({ text: 'Please enter your Date Of Birth!' });
    } else if (DOB >= today) {
        errorsList.push({ text: 'Date of Birth cannot be in the future!' });
    } else if (DOB <= hundredYearsAgo) {
        errorsList.push({ text: 'Date of Birth cannot be more than 100 years ago!' });
    }

    // Check if password is provided and meets the guidelines
    if (!password || password.length <= 0) {
        errorsList.push({ text: 'Please enter a password!' });
    } else {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasSpecialChar = /[!@#$%^&*]/.test(password);

        if (password.length < 8) {
            errorsList.push({ text: 'Password must be at least 8 characters long!' });
        }
        if (!hasUpperCase) {
            errorsList.push({ text: 'Password must contain at least one uppercase letter!' });
        }
        if (!hasLowerCase) {
            errorsList.push({ text: 'Password must contain at least one lowercase letter!' });
        }
        if (!hasSpecialChar) {
            errorsList.push({ text: 'Password must contain at least one special character (e.g., !@#$%^&*)!' });
        }
    }

    // Add check for gender's radio button
    if (!gender || (gender !== 'Male' && gender !== 'Female')) {
        errorsList.push({ text: 'Please select a gender!' });
    }

    // Check if Phone No is provided
    if (!phone_no || phone_no.length < 8) {
        errorsList.push({ text: 'Please enter a valid Phone No!' });
    }

    // Check if Postal Code is provided
    if (!postal_code || postal_code.length < 6) {
        errorsList.push({ text: 'Please enter a valid Postal Code!' });
    }

    // Check if Address is provided
    if (!address || address.length <= 0) {
        errorsList.push({ text: 'Please enter Your Address!' });
    }

    // Check if password is provided
    if (!confirm_password || confirm_password.length <= 0) {
        errorsList.push({ text: 'Please enter Your Confirm Password!' });
    }

    // Check if the passwords are the same
    if (password != confirm_password) {
        errorsList.push({ text: 'Your passwords are not match!' });
    }

    // If there are errors, re-render the sign-up page with the errors
    if (errorsList.length > 0) {
        res.render('ACCOUNTS/sign_up', {
            errors: errorsList,
            user_name: user_name,
            email: email,
            password: password,
            travel_doc_id: travel_doc_id,
            DOB: DOB,
            gender: gender,
            phone_no: phone_no,
            postal_code: postal_code,
            address: address,
            confirm_password: confirm_password
        });
    } else {
        Promise.all([
            User.findOne({ where: { email: email } }),
            User.findOne({ where: { travel_doc_id: travel_doc_id } })
        ]).then(([userByEmail, userByTravelDocID]) => {
            let errorsList = [];
            if (userByEmail) {
                errorsList.push({ text: 'Email is already registered!' });
            }
            if (userByTravelDocID) {
                errorsList.push({ text: 'Travel Document ID is already registered!' });
            }
            if (userByEmail || userByTravelDocID) {
                res.render('ACCOUNTS/sign_up', {
                    layout: 'main',
                    errors: errorsList,
                    user_name,
                    email,
                    password,
                    travel_doc_id,
                    DOB,
                    gender,
                    phone_no,
                    postal_code,
                    address
                });
            } else {
                //Generate salt hased password
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(password, salt, (err, hash) => {
                        if (err) throw err;
                        password = hash;

                        //Create new user
                        User.create({
                            user_name, email, password, travel_doc_id, DOB, gender, phone_no, postal_code, address
                        }).then(user => {
                            const emailBody = compileTemplate('registeredEmail', { name: user_name });

                            // Send the email
                            sendEmail({
                                to: email,
                                subject: 'Welcome to JourneyJunction!',
                                body: emailBody,
                                isHtml: true // Ensure the email is sent as HTML
                            });
                            res.redirect('/login');
                        }).catch(err => console.log(err));

                    }
                    )
                }
                )
            };
        });
    }
});

//ACCOUNT MANAGEMENT END

let port = 3000;

// app.listen(port, () => {
//     console.log(`Server is running on port http://localhost:${port}`);
// });
app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
    // ngrok.connect({ addr: 3000, authtoken_from_env: true })
    //     .then(listener => console.log(`Ingress established at: ${listener.url()}`));
});
