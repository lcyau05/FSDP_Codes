const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

//load user model
const User = require('../models/User');

function localStrategy(passport) {
    passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
        User.findOne({ where: { email: email } })
            .then(user => {
                if (!user) {
                    return done(null, false, { message: 'No User Found' });
                }
                ///Match password
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) throw err;
                    if (isMatch) {
                        return done(null, user);
                    } else {
                        return done(null, false, { message: 'Password incorrect' });
                    }
                })
            })
    }));
    //serialise (stores)user id into session upon successful
    //authenticate
    passport.serializeUser((user, done) => {
        done(null, { id: user.id, role: user.role, username: user.user_name }); // Serializing user object with id and role
    });

    // user object is retrieved by userID from session and put into req.user
    passport.deserializeUser(async (serializedUser, done) => {
        try {
            const { id, role, username } = serializedUser;
            const user = await User.findByPk(id);
            if (user) {
                // Attach the role to the user object if needed
                user.id = id;
                user.role = role;
                user.username = username;
                done(null, user); // User object saved in req.session
            } else {
                done(new Error('User not found'), null);
            }
        } catch (error) {
            console.error(error);
            done(error, null); // Error handling
        }
    });
}
module.exports = { localStrategy };