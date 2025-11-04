const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'production' 
        ? 'https://api.baby2world.com/api/auth/google/callback'
        : 'http://localhost:5000/api/auth/google/callback',
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Try by Google ID first
        let user = await User.findByGoogleId(profile.id);

        if (user) {
          // Check if user is active
          if (user.isActive === false) {
            return done(new Error('Your account has been deactivated. Please contact administrator.'), null);
          }
          return done(null, user);
        }

        // Fallback: check by email to prevent duplicate accounts
        const email = Array.isArray(profile.emails) && profile.emails[0] ? profile.emails[0].value : null;
        if (!email) {
          return done(new Error('Google profile email missing'), null);
        }

        const existingByEmail = await User.findByEmail(email);
        if (existingByEmail) {
          // Option: link account here. For now, fail with clear error.
          return done(new Error('Email already registered. Please login with your existing method.'), null);
        }

        const created = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email,
          picture: Array.isArray(profile.photos) && profile.photos[0] ? profile.photos[0].value : null,
          role: 'user',
        });

        return done(null, created);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  try {
    done(null, user.id);
  } catch (err) {
    done(err);
  }
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
