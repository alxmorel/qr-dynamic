const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

// Imports de la base de données et utilitaires
const { User } = require("./src/models");
const { findOrCreateGoogleUser } = require("./utils/auth");
const { generateUniqueUserHash } = require("./utils/hash");

// Imports des routes
const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/auth");
const sitesRoutes = require("./routes/sites");
const adminRoutes = require("./routes/admin");
const invitationsRoutes = require("./routes/invitations");
const legalRoutes = require("./routes/legal");

const app = express();

// Configuration Express
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Configuration des sessions
app.use(session({
  secret: process.env.SESSION_SECRET || "changez-moi-en-production",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Configuration Passport
const { isGoogleAuthConfigured, getGoogleAuthConfig } = require('./config/googleAuth');

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  try {
    const user = User.findById.get(id);
    if (!user) {
      return done(null, false);
    }
    if (!user.hash) {
      const userHash = generateUniqueUserHash();
      User.updateHash.run(userHash, user.id);
      user.hash = userHash;
    }
    const { password_hash, ...userWithoutPassword } = user;
    done(null, userWithoutPassword);
  } catch (error) {
    done(error);
  }
});

const googleAuthConfig = getGoogleAuthConfig();
if (googleAuthConfig) {
  passport.use(new GoogleStrategy({
    clientID: googleAuthConfig.clientID,
    clientSecret: googleAuthConfig.clientSecret,
    callbackURL: googleAuthConfig.callbackURL,
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
      const user = await findOrCreateGoogleUser({
        googleId: profile.id,
        email,
        displayName: profile.displayName
      });
      const avatarUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;
      req._lastGoogleProfile = {
        name: profile.displayName || (email ? email.split("@")[0] : "Compte Google"),
        email,
        avatarUrl
      };
      if (!user.hash) {
        const userHash = generateUniqueUserHash();
        User.updateHash.run(userHash, user.id);
        user.hash = userHash;
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  }));
} else {
  console.warn("L'authentification Google n'est pas configurée. Définissez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.");
}

// Routes
app.use("/", indexRoutes);
app.use("/", authRoutes);
app.use("/", sitesRoutes);
app.use("/admin", adminRoutes);
app.use("/", invitationsRoutes);
app.use("/", legalRoutes);

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`QR Dynamic running on port ${PORT}`));
