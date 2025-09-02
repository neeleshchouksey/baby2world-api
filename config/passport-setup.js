const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        } else {
          user = await User.findOne({ email: profile.emails[0].value });
          if(user) {
             // Agar user email se pehle se hai to error de sakte hain ya account link kar sakte hain
             // Abhi ke liye naya user bana rahe hain (ya error dena behtar hai)
             return done(new Error("Email already registered. Please login with password."), null);
          }

          const newUser = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            picture: profile.photos[0].value,
            role: 'user', 
          });

          await newUser.save();
          done(null, newUser);
        }
      } catch (error) {
        done(error, false);
      }
    }
  )
);