const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { db } = require('./firebase');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // Use relative URL - Passport automatically constructs full URL from request
    callbackURL: '/auth/google/callback',
    // Trust proxy headers (X-Forwarded-Proto) from Cloud Run
    proxy: true,
    // Allow overriding with absolute URL if needed
    ...(process.env.GOOGLE_CALLBACK_URL && { callbackURL: process.env.GOOGLE_CALLBACK_URL })
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const userId = profile.id;
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      const userData = {
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0]?.value,
        lastLogin: new Date()
      };

      if (!userDoc.exists) {
        // Create new user
        await userRef.set({
          ...userData,
          createdAt: new Date(),
          arcaCredentials: null,
          bookingRules: [],
          notificationsEnabled: true
        });
      } else {
        // Update existing user
        await userRef.update({
          lastLogin: new Date(),
          name: userData.name,
          picture: userData.picture
        });
      }

      return done(null, { id: userId, ...userData });
    } catch (error) {
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return done(null, false);
    }
    done(null, { id, ...userDoc.data() });
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;

