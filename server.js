const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const multer = require("multer");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

// Imports pour la nouvelle architecture
const { userQueries, siteQueries, contentQueries, invitationQueries, siteAdminQueries, pendingRegistrationQueries } = require("./database");
const { createUserWithSite, authenticateUser, verifyPassword, hashPassword, findOrCreateGoogleUser } = require("./utils/auth");
const { generateUniqueHash, generateUniqueUserHash, generateInvitationToken } = require("./utils/hash");
const { sendVerificationEmail } = require("./utils/mailer");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Configuration de multer pour l'upload d'images
// Organiser les uploads par utilisateur et site
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Si on a un hashSite dans les paramètres, organiser par user_id/site_hash
    let uploadDir = "./uploads";
    const hashSite = req.params.hashSite || req.params.hash;
    if (hashSite) {
      const site = siteQueries.findByHash.get(hashSite);
      if (site && req.session.user_id === site.user_id) {
        uploadDir = path.join("./uploads", String(site.user_id), hashSite);
      }
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Générer un nom de fichier unique
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    // Nettoyer l'extension pour éviter les caractères spéciaux
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    // Déterminer le préfixe selon le type de fichier
    if (file.fieldname === "faviconFile") {
      cb(null, "favicon-" + uniqueSuffix + ext);
    } else if (file.fieldname === "contentImageFile") {
      cb(null, "content-" + uniqueSuffix + ext);
    } else {
      cb(null, "background-" + uniqueSuffix + ext);
    }
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accepter uniquement les images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont autorisées"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Sessions (simple et efficace)
app.use(session({
  secret: process.env.SESSION_SECRET || "changez-moi-en-production",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

const isGoogleAuthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || `${appBaseUrl}/auth/google/callback`;

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  try {
    const user = userQueries.findById.get(id);
    if (!user) {
      return done(null, false);
    }
    if (!user.hash) {
      const userHash = generateUniqueUserHash();
      userQueries.updateHash.run(userHash, user.id);
      user.hash = userHash;
    }
    const { password_hash, ...userWithoutPassword } = user;
    done(null, userWithoutPassword);
  } catch (error) {
    done(error);
  }
});

if (isGoogleAuthConfigured) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: googleCallbackUrl,
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
      const user = await findOrCreateGoogleUser({
        googleId: profile.id,
        email,
        displayName: profile.displayName
      });
      if (!user.hash) {
        const userHash = generateUniqueUserHash();
        userQueries.updateHash.run(userHash, user.id);
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

function renderLogin(res, options = {}) {
  res.render("login", {
    error: null,
    success: null,
    inviteToken: null,
    ...options,
    googleAuthEnabled: isGoogleAuthConfigured
  });
}

function renderRegister(res, options = {}) {
  res.render("register", {
    error: null,
    success: null,
    inviteToken: null,
    ...options,
    googleAuthEnabled: isGoogleAuthConfigured
  });
}

function ensureUserHash(user) {
  if (!user) {
    return null;
  }
  if (!user.hash) {
    const userHash = generateUniqueUserHash();
    userQueries.updateHash.run(userHash, user.id);
    user.hash = userHash;
  }
  return user.hash;
}

// Middleware pour vérifier si l'utilisateur est connecté
function requireAuth(req, res, next) {
  if (req.session.user_id) {
    return next();
  }
  res.redirect("/login");
}

// Middleware pour vérifier que l'utilisateur correspond au hashUser
function requireUserHash(req, res, next) {
  const hashUser = req.params.hashUser;
  if (!hashUser) {
    return res.status(400).send("Hash utilisateur manquant");
  }
  
  const user = userQueries.findByHash.get(hashUser);
  if (!user) {
    return res.status(404).send("Utilisateur introuvable");
  }
  
  if (user.id !== req.session.user_id) {
    return res.status(403).send("Accès interdit : vous n'êtes pas autorisé à accéder à cette page");
  }
  
  req.user = user;
  req.userHash = hashUser;
  next();
}

// Middleware pour vérifier que l'utilisateur est propriétaire du site
function requireSiteOwner(req, res, next) {
  const hash = req.params.hash || req.params.hashSite;
  if (!hash) {
    return res.status(400).send("Hash manquant");
  }
  
  const site = siteQueries.findByHash.get(hash);
  if (!site) {
    return res.status(404).send("Site introuvable");
  }
  
  // Vérifier si l'utilisateur est le propriétaire
  if (site.user_id === req.session.user_id) {
    req.site = site;
    req.isOwner = true;
    return next();
  }
  
  // Vérifier si l'utilisateur est un administrateur invité
  const adminCheck = siteAdminQueries.isAdmin.get(site.id, req.session.user_id);
  if (adminCheck && adminCheck.count > 0) {
    req.site = site;
    req.isOwner = false;
    return next();
  }
  
  return res.status(403).send("Accès interdit : vous n'êtes pas autorisé à accéder à ce site");
}

// Fonction pour obtenir l'utilisateur actuel
function getCurrentUser(req) {
  if (!req.session.user_id) {
    return null;
  }
  return userQueries.findById.get(req.session.user_id);
}

// Convertir les URLs YouTube en format embed
function convertYouTubeUrl(url) {
  if (!url) return url;
  
  // Si c'est déjà une URL embed, la retourner telle quelle
  if (url.includes('youtube.com/embed/')) {
    return url;
  }
  
  // Extraire l'ID de la vidéo depuis différentes formats d'URL YouTube
  let videoId = null;
  
  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }
  
  // Format: https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }
  
  // Format: https://www.youtube.com/embed/VIDEO_ID (déjà en embed)
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&]+)/);
  if (embedMatch) {
    return url;
  }
  
  // Si on a trouvé un ID, créer l'URL embed
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  // Sinon, retourner l'URL originale
  return url;
}

// Convertir les URLs Spotify en format embed
function convertSpotifyUrl(url) {
  if (!url) return url;
  
  // Si c'est déjà une URL embed, la retourner telle quelle
  if (url.includes('open.spotify.com/embed/')) {
    return url;
  }
  
  // Extraire le type (album, playlist, track) et l'ID depuis l'URL Spotify
  // Format: https://open.spotify.com/album/ID ou https://open.spotify.com/intl-fr/album/ID?si=...
  // Format: https://open.spotify.com/playlist/ID ou https://open.spotify.com/intl-fr/playlist/ID?si=...
  // Format: https://open.spotify.com/track/ID ou https://open.spotify.com/intl-fr/track/ID?si=...
  
  const spotifyMatch = url.match(/open\.spotify\.com\/(?:intl-[^\/]+\/)?(album|playlist|track)\/([^?&]+)/);
  if (spotifyMatch) {
    const type = spotifyMatch[1]; // album, playlist, ou track
    const id = spotifyMatch[2]; // ID de l'album/playlist/track
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`;
  }
  
  // Sinon, retourner l'URL originale
  return url;
}

// Page d'accueil
app.get("/", (req, res) => {
  // Si l'utilisateur est connecté, rediriger vers sa liste de sites
  if (req.session.user_id) {
    const user = userQueries.findById.get(req.session.user_id);
    if (user && user.hash) {
      return res.redirect(`/admin/${user.hash}/sites`);
    }
  }
  // Sinon, afficher la page d'accueil avec liens vers login/register
  res.render("home", { user: getCurrentUser(req) });
});

// Page d'inscription
app.get("/register", (req, res) => {
  if (req.session.user_id) {
    // Si déjà connecté et qu'il y a une invitation, accepter l'invitation
    if (req.query.invite) {
      return res.redirect(`/invite/${req.query.invite}`);
    }
    // Si déjà connecté, rediriger vers la liste des sites
    const user = userQueries.findById.get(req.session.user_id);
    if (user && user.hash) {
      return res.redirect(`/admin/${user.hash}/sites`);
    }
    return res.redirect("/");
  }
  return renderRegister(res, { inviteToken: req.query.invite || null });
});

// Traitement de l'inscription
app.post("/register", async (req, res) => {
  try {
    const { username, email, password, confirmPassword, inviteToken } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return renderRegister(res, { error: "Tous les champs sont requis", inviteToken: inviteToken || null });
    }
    
    if (password !== confirmPassword) {
      return renderRegister(res, { error: "Les mots de passe ne correspondent pas", inviteToken: inviteToken || null });
    }
    
    if (password.length < 6) {
      return renderRegister(res, { error: "Le mot de passe doit contenir au moins 6 caractères", inviteToken: inviteToken || null });
    }
    
    // Nettoyer les inscriptions périmées
    pendingRegistrationQueries.deleteExpired.run();

    // Vérifier si email ou username déjà utilisés par un utilisateur confirmé ou une inscription en attente
    const existingEmail = userQueries.findByEmail.get(email);
    if (existingEmail) {
      return renderRegister(res, { error: "Cet email est déjà utilisé", inviteToken: inviteToken || null });
    }
    
    const existingUsername = userQueries.findByUsername.get(username);
    if (existingUsername) {
      return renderRegister(res, { error: "Ce nom d'utilisateur est déjà utilisé", inviteToken: inviteToken || null });
    }
    
    const pendingEmail = pendingRegistrationQueries.findByEmail.get(email);
    if (pendingEmail) {
      return renderRegister(res, { error: "Une inscription est déjà en attente avec cet email. Vérifiez vos emails.", inviteToken: inviteToken || null });
    }
    
    const pendingUsername = pendingRegistrationQueries.findByUsername.get(username);
    if (pendingUsername) {
      return renderRegister(res, { error: "Une inscription est déjà en attente avec ce nom d'utilisateur. Vérifiez vos emails.", inviteToken: inviteToken || null });
    }

    // Hasher le mot de passe pour le stocker de façon sécurisée dans l'inscription en attente
    const passwordHash = await hashPassword(password);
    const verificationToken = generateInvitationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    pendingRegistrationQueries.create.run(
      username,
      email,
      passwordHash,
      inviteToken || null,
      verificationToken,
      expiresAt
    );

    const baseUrl = process.env.APP_BASE_URL || `${req.get('x-forwarded-proto') || req.protocol || 'http'}://${req.get('host') || 'localhost:3000'}`;
    const verificationLink = `${baseUrl}/verify-email/${verificationToken}`;

    await sendVerificationEmail(email, verificationLink);

    return renderRegister(res, { 
      success: "Nous avons envoyé un email de confirmation. Cliquez sur le lien reçu pour finaliser la création de votre compte.", 
      inviteToken: inviteToken || null 
    });
  } catch (error) {
    console.error("Erreur lors de la préparation de l'inscription:", error);
    return renderRegister(res, { error: error.message || "Impossible d'envoyer l'email de vérification", inviteToken: req.body.inviteToken || null });
  }
});

// Vérification de l'email et création effective du compte
app.get("/verify-email/:token", async (req, res) => {
  const token = req.params.token;
  try {
    pendingRegistrationQueries.deleteExpired.run();

    const pendingRegistration = pendingRegistrationQueries.findByToken.get(token);

    if (!pendingRegistration) {
      return res.render("verify-email", {
        success: false,
        title: "Lien invalide",
        message: "Ce lien de vérification est invalide ou a déjà été utilisé."
      });
    }

    const now = new Date();
    const expiresAt = new Date(pendingRegistration.expires_at);
    if (now > expiresAt) {
      pendingRegistrationQueries.deleteById.run(pendingRegistration.id);
      return res.render("verify-email", {
        success: false,
        title: "Lien expiré",
        message: "Ce lien de vérification a expiré. Recommencez l'inscription pour recevoir un nouveau lien."
      });
    }

    // Créer l'utilisateur définitivement
    const { user } = await createUserWithSite(
      pendingRegistration.username,
      pendingRegistration.email,
      null,
      { passwordHashOverride: pendingRegistration.password_hash }
    );

    // Nettoyer l'inscription en attente
    pendingRegistrationQueries.deleteById.run(pendingRegistration.id);

    // Connecter automatiquement l'utilisateur
    req.session.user_id = user.id;

    // S'il y avait une invitation, répéter la logique d'acceptation automatique
    if (pendingRegistration.invite_token) {
      try {
        const invitation = invitationQueries.findByToken.get(pendingRegistration.invite_token);
        if (invitation && !invitation.used) {
          const expiresAtInvite = new Date(invitation.expires_at);
          if (now <= expiresAtInvite) {
            const siteInvited = siteQueries.findById.get(invitation.site_id);
            if (siteInvited) {
              if (siteInvited.user_id === user.id) {
                return res.redirect(`/invite/${pendingRegistration.invite_token}`);
              }

              const adminCheck = siteAdminQueries.isAdmin.get(siteInvited.id, user.id);
              if (adminCheck && adminCheck.count > 0) {
                return res.redirect(`/invite/${pendingRegistration.invite_token}`);
              }

              siteAdminQueries.create.run(siteInvited.id, user.id);
              invitationQueries.markAsUsed.run(user.id, pendingRegistration.invite_token);
              return res.redirect(`/invite/${pendingRegistration.invite_token}`);
            }
          }
        }
      } catch (error) {
        console.error("Erreur lors de l'acceptation de l'invitation après vérification d'email:", error);
      }
    }

    return res.redirect(`/admin/${user.hash}/sites`);
  } catch (error) {
    console.error("Erreur lors de la vérification d'email:", error);
    return res.render("verify-email", {
      success: false,
      title: "Erreur inattendue",
      message: "Une erreur est survenue lors de la vérification de votre email. Veuillez réessayer."
    });
  }
});

// Page de connexion
app.get("/login", (req, res) => {
  if (req.session.user_id) {
    // Si déjà connecté et qu'il y a une invitation, accepter l'invitation
    if (req.query.invite) {
      return res.redirect(`/invite/${req.query.invite}`);
    }
    // Si déjà connecté, rediriger vers la liste des sites
    const user = userQueries.findById.get(req.session.user_id);
    if (user && user.hash) {
      return res.redirect(`/admin/${user.hash}/sites`);
    }
    return res.redirect("/");
  }
  return renderLogin(res, { success: req.query.success || null, inviteToken: req.query.invite || null });
});

// Traitement de la connexion
app.post("/login", async (req, res) => {
  try {
    const { identifier, password, inviteToken } = req.body;
    
    if (!identifier || !password) {
      return renderLogin(res, { error: "Email/username et mot de passe requis", inviteToken: inviteToken || null });
    }
    
    const user = await authenticateUser(identifier, password);
    
    if (!user) {
      return renderLogin(res, { error: "Identifiants incorrects", inviteToken: inviteToken || null });
    }
    
    // Créer la session
    req.session.user_id = user.id;
    
    ensureUserHash(user);
    
    // Si une invitation est présente, rediriger vers l'acceptation
    if (inviteToken) {
      return res.redirect(`/invite/${inviteToken}`);
    }
    
    // Rediriger vers la liste des sites
    res.redirect(`/admin/${user.hash}/sites`);
  } catch (error) {
    return renderLogin(res, { error: "Une erreur est survenue lors de la connexion", inviteToken: req.body.inviteToken || null });
  }
});

app.get("/auth/google", (req, res, next) => {
  if (!isGoogleAuthConfigured) {
    return res.status(503).send("La connexion Google n'est pas disponible.");
  }
  if (req.query.inviteToken) {
    req.session.pendingInviteToken = req.query.inviteToken;
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })(req, res, next);
});

app.get("/auth/google/callback",
  (req, res, next) => {
    if (!isGoogleAuthConfigured) {
      return res.redirect("/login?error=google");
    }
    next();
  },
  passport.authenticate("google", { failureRedirect: "/login?error=google" }),
  (req, res) => {
    if (req.user) {
      req.session.user_id = req.user.id;
    }
    const inviteToken = req.session.pendingInviteToken;
    delete req.session.pendingInviteToken;
    const userHash = ensureUserHash(req.user);
    if (inviteToken) {
      return res.redirect(`/invite/${inviteToken}`);
    }
    if (userHash) {
      return res.redirect(`/admin/${userHash}/sites`);
    }
    return res.redirect("/");
  }
);

// Déconnexion
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erreur lors de la déconnexion:", err);
    }
    res.redirect("/");
  });
});

// Route POST pour vérifier le mot de passe public
app.post("/:hash/verify-password", async (req, res) => {
  const hash = req.params.hash;
  const { password } = req.body;
  
  const site = siteQueries.findByHash.get(hash);
  if (!site) {
    return res.status(404).json({ error: "Site introuvable" });
  }
  
  // Vérifier si la protection par mot de passe est activée
  if (!site.public_password_enabled || !site.public_password_hash) {
    return res.status(400).json({ error: "Ce site n'est pas protégé par un mot de passe" });
  }
  
  // Vérifier le mot de passe
  const isValid = await verifyPassword(password, site.public_password_hash);
  
  if (isValid) {
    // Ne pas mémoriser dans la session - la popup apparaîtra à chaque visite
    // On retourne juste un token temporaire pour cette requête
    return res.json({ success: true });
  } else {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
});

// Route pour récupérer le contenu après authentification
app.get("/:hash/content", (req, res) => {
  const hash = req.params.hash;
  
  const site = siteQueries.findByHash.get(hash);
  if (!site) {
    return res.status(404).json({ error: "Site introuvable" });
  }
  
  // Charger le contenu du site
  const content = contentQueries.findBySiteId.get(site.id);
  if (!content) {
    return res.json({
      content: {
        type: "text",
        value: "Ce site n'a pas encore de contenu.",
        title: "Site vide",
        backgroundColor: "#faf6ff",
        cardBackgroundColor: "#ffffff"
      }
    });
  }
  
  // Normaliser les chemins d'URL (remplacer les backslashes par des slashes et nettoyer)
  if (content.backgroundImage && content.backgroundImage.startsWith("/uploads/")) {
    content.backgroundImage = content.backgroundImage.replace(/\\/g, '/');
  }
  if (content.favicon && content.favicon.startsWith("/uploads/")) {
    content.favicon = content.favicon.replace(/\\/g, '/');
  }
  if (content.value && content.value.startsWith("/uploads/")) {
    content.value = content.value.replace(/\\/g, '/');
  }
  
  // Convertir les URLs YouTube en format embed si nécessaire
  if (content.type === "video" && content.value) {
    content.value = convertYouTubeUrl(content.value);
  }
  // Convertir les URLs Spotify en format embed si nécessaire
  if (content.type === "embed" && content.value) {
    content.value = convertSpotifyUrl(content.value);
  }
  
  res.json({ content });
});

// Route pour afficher un site public (doit être en dernier pour ne pas capturer les autres routes)
app.get("/:hash", (req, res) => {
  const hash = req.params.hash;
  
  // Ignorer les routes spéciales (les fichiers statiques sont déjà gérés par express.static)
  const reservedRoutes = ['login', 'register', 'logout', 'admin'];
  if (reservedRoutes.includes(hash)) {
    return res.status(404).send("Page introuvable");
  }
  
  const site = siteQueries.findByHash.get(hash);
  if (!site) {
    return res.status(404).send("Site introuvable");
  }
  
  // Vérifier si la protection par mot de passe est activée
  const isPasswordProtected = site.public_password_enabled && site.public_password_hash;
  
  // Si protégé, toujours afficher la popup (ne pas mémoriser l'authentification)
  if (isPasswordProtected) {
    // Ne pas charger le contenu - juste afficher la popup avec un fond par défaut
    return res.render("index", { 
      content: null,
      requiresPassword: true,
      siteHash: hash
    });
  }
  
  // Si non protégé, charger le contenu normalement
  const content = contentQueries.findBySiteId.get(site.id);
  if (!content) {
    // Si pas de contenu, afficher un message par défaut
    return res.render("index", {
      content: {
        type: "text",
        value: "Ce site n'a pas encore de contenu.",
        title: "Site vide",
        backgroundColor: "#faf6ff",
        cardBackgroundColor: "#ffffff"
      },
      requiresPassword: false
    });
  }
  
  // Normaliser les chemins d'URL (remplacer les backslashes par des slashes et nettoyer)
  if (content.backgroundImage && content.backgroundImage.startsWith("/uploads/")) {
    content.backgroundImage = content.backgroundImage.replace(/\\/g, '/');
  }
  if (content.favicon && content.favicon.startsWith("/uploads/")) {
    content.favicon = content.favicon.replace(/\\/g, '/');
  }
  if (content.value && content.value.startsWith("/uploads/")) {
    content.value = content.value.replace(/\\/g, '/');
  }
  
  // Convertir les URLs YouTube en format embed si nécessaire
  if (content.type === "video" && content.value) {
    content.value = convertYouTubeUrl(content.value);
  }
  // Convertir les URLs Spotify en format embed si nécessaire
  if (content.type === "embed" && content.value) {
    content.value = convertSpotifyUrl(content.value);
  }
  
  res.render("index", { 
    content,
    requiresPassword: false
  });
});

// Route de compatibilité pour les anciennes URLs /admin/:hash
// Redirige vers la nouvelle structure /admin/:hashUser/sites/:hashSite
app.get("/admin/:hash", requireAuth, requireSiteOwner, (req, res) => {
  const site = req.site;
  const user = userQueries.findById.get(site.user_id);
  
  // S'assurer que l'utilisateur a un hash
  if (!user.hash) {
    const userHash = generateUniqueUserHash();
    userQueries.updateHash.run(userHash, user.id);
    user.hash = userHash;
  }
  
  res.redirect(`/admin/${user.hash}/sites/${site.hash}`);
});

// Liste des sites d'un utilisateur (protégée)
app.get("/admin/:hashUser/sites", requireAuth, requireUserHash, (req, res) => {
  const user = req.user;
  
  // Récupérer tous les sites où l'utilisateur est administrateur (propriétaire ou invité)
  const sites = siteAdminQueries.findSitesByUserId.all(user.id, user.id);
  
  // Enrichir chaque site avec son titre et indiquer s'il est propriétaire ou invité
  const sitesWithTitles = sites.map(site => {
    const content = contentQueries.findBySiteId.get(site.id);
    const isOwner = site.user_id === user.id;
    return {
      ...site,
      title: content ? content.title : null,
      isOwner: isOwner
    };
  });
  
  res.render("sites-list", {
    sites: sitesWithTitles,
    userHash: req.userHash,
    success: req.query.success || null,
    error: req.query.error || null,
    content: null  // Pas de contenu pour cette vue
  });
});

// Créer un nouveau site (protégée)
app.post("/admin/:hashUser/sites", requireAuth, requireUserHash, async (req, res) => {
  try {
    const user = req.user;
    
    // Générer un hash unique pour le site
    const siteHash = generateUniqueHash();
    
    // Créer le site
    const siteResult = siteQueries.create.run(siteHash, user.id);
    const siteId = siteResult.lastInsertRowid;
    
    res.json({
      success: true,
      siteHash: siteHash,
      siteId: siteId
    });
  } catch (error) {
    console.error("Erreur lors de la création du site:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la création du site"
    });
  }
});

// Supprimer un site (protégée)
app.delete("/admin/:hashUser/sites/:hashSite", requireAuth, requireUserHash, requireSiteOwner, async (req, res) => {
  try {
    const site = req.site;
    const user = req.user;
    
    // Supprimer le site (et son contenu via CASCADE)
    siteQueries.delete.run(site.id, user.id);
    
    // Supprimer les fichiers uploadés associés au site
    const uploadDir = path.join("./uploads", String(user.id), site.hash);
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
    
    res.json({
      success: true
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du site:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la suppression du site"
    });
  }
});

// Page admin pour un site spécifique (protégée)
app.get("/admin/:hashUser/sites/:hashSite", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
  const site = req.site;
  const content = contentQueries.findBySiteId.get(site.id);
  
  // Initialiser avec des valeurs par défaut si pas de contenu
  const defaultContent = {
    type: "text",
    value: "",
    title: "Mon site",
    backgroundColor: "#faf6ff",
    backgroundImage: null,
    cardBackgroundColor: "#ffffff",
    favicon: null
  };
  
  const displayContent = content || defaultContent;
  
  // Normaliser les chemins d'URL (remplacer les backslashes par des slashes et nettoyer)
  if (displayContent.backgroundImage && displayContent.backgroundImage.startsWith("/uploads/")) {
    displayContent.backgroundImage = displayContent.backgroundImage.replace(/\\/g, '/');
  }
  if (displayContent.favicon && displayContent.favicon.startsWith("/uploads/")) {
    displayContent.favicon = displayContent.favicon.replace(/\\/g, '/');
  }
  if (displayContent.value && displayContent.value.startsWith("/uploads/")) {
    displayContent.value = displayContent.value.replace(/\\/g, '/');
  }
  
  // Construire l'URL complète du site public
  // Gérer les proxies (X-Forwarded-Proto pour HTTPS)
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  const publicUrl = `${protocol}://${host}/${site.hash}`;
  
  res.render("admin", { 
    content: displayContent,
    site: site,
    userHash: req.userHash,
    success: req.query.success || null,
    publicPasswordEnabled: site.public_password_enabled ? true : false,
    publicPassword: site.public_password || null,
    publicUrl: publicUrl,
    isOwner: req.isOwner !== false // true par défaut si le middleware requireSiteOwner a réussi
  });
});

// Mise à jour du contenu d'un site (protégée)
app.post("/admin/:hashUser/sites/:hashSite", requireAuth, requireUserHash, requireSiteOwner, upload.fields([
  { name: "backgroundImageFile", maxCount: 1 },
  { name: "faviconFile", maxCount: 1 },
  { name: "contentImageFile", maxCount: 1 }
]), async (req, res) => {
  const site = req.site;
  const existingContent = contentQueries.findBySiteId.get(site.id);
  
  // Gérer le mot de passe public
  const publicPasswordEnabled = req.body.publicPasswordEnabled === "on" || req.body.publicPasswordEnabled === "true";
  let publicPasswordHash = site.public_password_hash || null;
  let publicPasswordPlain = site.public_password || null;
  
  if (publicPasswordEnabled) {
    const publicPassword = req.body.publicPassword;
    if (publicPassword && publicPassword.trim() !== "") {
      // Hasher le nouveau mot de passe
      publicPasswordHash = await hashPassword(publicPassword);
      // Stocker aussi le mot de passe en clair pour l'affichage dans l'admin
      publicPasswordPlain = publicPassword;
    }
    // Si pas de nouveau mot de passe mais que la protection est activée, garder l'ancien hash et mot de passe
  } else {
    // Désactiver la protection
    publicPasswordHash = null;
    publicPasswordPlain = null;
  }
  
  // Mettre à jour le mot de passe public
  siteQueries.updatePublicPassword.run(
    publicPasswordEnabled ? 1 : 0,
    publicPasswordHash,
    publicPasswordPlain,
    site.id
  );
  
  const newContent = {
    type: req.body.type || existingContent?.type || "text",
    value: req.body.value || existingContent?.value || "",
    title: req.body.title || existingContent?.title || "Mon site",
    backgroundColor: req.body.backgroundColor || existingContent?.backgroundColor || "#faf6ff",
    backgroundImage: existingContent?.backgroundImage || null,
    cardBackgroundColor: req.body.cardBackgroundColorValue || req.body.cardBackgroundColor || existingContent?.cardBackgroundColor || "#ffffff",
    favicon: existingContent?.favicon || null
  };
  
  const existingUploadedContentImage = existingContent?.type === "image" && existingContent.value && existingContent.value.startsWith("/uploads/")
    ? existingContent.value
    : null;
  
  if (newContent.type === "image") {
    if (req.files && req.files.contentImageFile && req.files.contentImageFile[0]) {
      const relativePath = `/uploads/${String(site.user_id)}/${site.hash}/${req.files.contentImageFile[0].filename}`;
      if (existingUploadedContentImage && existingUploadedContentImage !== relativePath) {
        const oldUploadedImagePath = path.join(".", existingUploadedContentImage);
        if (fs.existsSync(oldUploadedImagePath)) {
          fs.unlinkSync(oldUploadedImagePath);
        }
      }
      newContent.value = relativePath;
    } else if (existingUploadedContentImage) {
      newContent.value = existingUploadedContentImage;
    } else {
      newContent.value = existingContent?.value || "";
    }
  }

  // Gérer l'upload de l'icône
  if (req.files && req.files.faviconFile && req.files.faviconFile[0]) {
    // Construire le chemin relatif depuis la racine (utiliser des slashes normaux pour les URLs)
    const relativePath = `/uploads/${String(site.user_id)}/${site.hash}/${req.files.faviconFile[0].filename}`;
    
    // Supprimer l'ancienne icône si elle existe
    if (existingContent?.favicon && existingContent.favicon.startsWith("/uploads/")) {
      const oldFaviconPath = path.join(".", existingContent.favicon);
      if (fs.existsSync(oldFaviconPath)) {
        fs.unlinkSync(oldFaviconPath);
      }
    }
    newContent.favicon = relativePath;
  } else if (req.body.removeFavicon === "true") {
    // Supprimer l'icône si demandé
    if (existingContent?.favicon && existingContent.favicon.startsWith("/uploads/")) {
      const oldFaviconPath = path.join(".", existingContent.favicon);
      if (fs.existsSync(oldFaviconPath)) {
        fs.unlinkSync(oldFaviconPath);
      }
    }
    newContent.favicon = null;
  } else if (existingContent?.favicon) {
    // Conserver l'icône existante
    newContent.favicon = existingContent.favicon;
  }

  // Si une nouvelle image est uploadée
  if (req.files && req.files.backgroundImageFile && req.files.backgroundImageFile[0]) {
    // Construire le chemin relatif depuis la racine (utiliser des slashes normaux pour les URLs)
    const relativePath = `/uploads/${String(site.user_id)}/${site.hash}/${req.files.backgroundImageFile[0].filename}`;
    
    // Supprimer l'ancienne image si elle existe
    if (existingContent?.backgroundImage && existingContent.backgroundImage.startsWith("/uploads/")) {
      const oldImagePath = path.join(".", existingContent.backgroundImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    newContent.backgroundImage = relativePath;
  } else if (req.body.removeBackgroundImage === "true") {
    // Supprimer l'image de fond si demandé
    if (existingContent?.backgroundImage && existingContent.backgroundImage.startsWith("/uploads/")) {
      const oldImagePath = path.join(".", existingContent.backgroundImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    newContent.backgroundImage = null;
  } else if (existingContent?.backgroundImage) {
    // Conserver l'image existante
    newContent.backgroundImage = existingContent.backgroundImage;
  }

  // Sauvegarder dans la base de données
  contentQueries.upsert(site.id, newContent);
  
  const user = userQueries.findById.get(site.user_id);
  res.redirect(`/admin/${user.hash}/sites/${site.hash}?success=true`);
});

// ========== ROUTES POUR LES INVITATIONS ==========

// Créer une invitation pour un site (seul le propriétaire peut créer)
app.post("/admin/:hashUser/sites/:hashSite/invitations", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
  try {
    const site = req.site;
    
    // Seul le propriétaire peut créer des invitations
    if (!req.isOwner) {
      return res.status(403).json({ error: "Seul le propriétaire peut créer des invitations" });
    }
    
    // Générer un token unique
    const token = generateInvitationToken();
    
    // Définir l'expiration (30 jours par défaut)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Créer l'invitation
    invitationQueries.create.run(
      site.id,
      req.session.user_id,
      token,
      expiresAt.toISOString()
    );
    
    // Construire l'URL complète de l'invitation
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const invitationUrl = `${protocol}://${host}/invite/${token}`;
    
    res.json({
      success: true,
      token: token,
      invitationUrl: invitationUrl,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error("Erreur lors de la création de l'invitation:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la création de l'invitation"
    });
  }
});

// Lister les invitations d'un site (uniquement les invitations actives)
app.get("/admin/:hashUser/sites/:hashSite/invitations", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
  try {
    const site = req.site;
    
    // Seul le propriétaire peut voir les invitations
    if (!req.isOwner) {
      return res.status(403).json({ error: "Seul le propriétaire peut voir les invitations" });
    }
    
    // Récupérer uniquement les invitations actives (non utilisées et non expirées)
    const invitations = invitationQueries.findActiveBySiteId.all(site.id);
    
    res.json({
      success: true,
      invitations: invitations
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des invitations:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des invitations"
    });
  }
});

// Supprimer une invitation
app.delete("/admin/:hashUser/sites/:hashSite/invitations/:invitationId", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
  try {
    const site = req.site;
    const invitationId = parseInt(req.params.invitationId);
    
    // Seul le propriétaire peut supprimer des invitations
    if (!req.isOwner) {
      return res.status(403).json({ error: "Seul le propriétaire peut supprimer des invitations" });
    }
    
    // Vérifier que l'invitation appartient bien au site (chercher dans toutes les invitations, pas seulement les actives)
    const allInvitations = invitationQueries.findBySiteId.all(site.id);
    const invitation = allInvitations.find(inv => inv.id === invitationId);
    
    if (!invitation) {
      return res.status(404).json({ error: "Invitation introuvable" });
    }
    
    // Supprimer l'invitation
    invitationQueries.delete.run(invitationId, req.session.user_id);
    
    res.json({
      success: true
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'invitation:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la suppression de l'invitation"
    });
  }
});

// Page pour accepter une invitation
app.get("/invite/:token", (req, res) => {
  const token = req.params.token;
  
  // Vérifier l'invitation
  const invitation = invitationQueries.findByToken.get(token);
  
  if (!invitation) {
    return res.render("invite-error", { 
      error: "Invitation introuvable",
      message: "Cette invitation n'existe pas ou a été supprimée."
    });
  }
  
  // Vérifier si l'invitation a expiré
  const now = new Date();
  const expiresAt = new Date(invitation.expires_at);
  if (now > expiresAt) {
    return res.render("invite-error", { 
      error: "Invitation expirée",
      message: "Cette invitation a expiré. Veuillez demander une nouvelle invitation."
    });
  }
  
  // Vérifier si l'invitation a déjà été utilisée
  if (invitation.used) {
    return res.render("invite-error", { 
      error: "Invitation déjà utilisée",
      message: "Cette invitation a déjà été utilisée."
    });
  }
  
  // Récupérer les informations du site
  const site = siteQueries.findById.get(invitation.site_id);
  if (!site) {
    return res.render("invite-error", { 
      error: "Site introuvable",
      message: "Le site associé à cette invitation n'existe plus."
    });
  }
  
  // Si l'utilisateur est déjà connecté, accepter directement l'invitation
  if (req.session.user_id) {
    // Vérifier si l'utilisateur est le propriétaire du site
    if (site.user_id === req.session.user_id) {
      const user = userQueries.findById.get(req.session.user_id);
      return res.render("invite-success", {
        message: "Vous êtes déjà le propriétaire de ce site. Aucune action nécessaire.",
        siteHash: site.hash,
        userHash: user.hash
      });
    }
    
    // Vérifier si l'utilisateur est déjà administrateur invité
    const adminCheck = siteAdminQueries.isAdmin.get(site.id, req.session.user_id);
    if (adminCheck && adminCheck.count > 0) {
      const user = userQueries.findById.get(req.session.user_id);
      return res.render("invite-success", {
        message: "Vous êtes déjà administrateur de ce site.",
        siteHash: site.hash,
        userHash: user.hash
      });
    }
    
    // Accepter l'invitation
    try {
      // Ajouter l'utilisateur comme administrateur
      siteAdminQueries.create.run(site.id, req.session.user_id);
      
      // Marquer l'invitation comme utilisée
      invitationQueries.markAsUsed.run(req.session.user_id, token);
      
      // Récupérer le hash de l'utilisateur
      const user = userQueries.findById.get(req.session.user_id);
      
      return res.render("invite-success", {
        message: "Invitation acceptée avec succès ! Vous êtes maintenant administrateur de ce site.",
        siteHash: site.hash,
        userHash: user.hash
      });
    } catch (error) {
      console.error("Erreur lors de l'acceptation de l'invitation:", error);
      return res.render("invite-error", {
        error: "Erreur",
        message: "Une erreur est survenue lors de l'acceptation de l'invitation."
      });
    }
  }
  
  // Si l'utilisateur n'est pas connecté, afficher la page d'invitation avec options de connexion/inscription
  const content = contentQueries.findBySiteId.get(site.id);
  const siteTitle = content ? content.title : "Site";
  
  res.render("invite", {
    token: token,
    siteTitle: siteTitle,
    siteHash: site.hash
  });
});

// Accepter une invitation après connexion/inscription
app.post("/invite/:token/accept", requireAuth, async (req, res) => {
  const token = req.params.token;
  const userId = req.session.user_id;
  
  // Vérifier l'invitation
  const invitation = invitationQueries.findByToken.get(token);
  
  if (!invitation) {
    return res.status(404).json({ error: "Invitation introuvable" });
  }
  
  // Vérifier si l'invitation a expiré
  const now = new Date();
  const expiresAt = new Date(invitation.expires_at);
  if (now > expiresAt) {
    return res.status(400).json({ error: "Invitation expirée" });
  }
  
  // Vérifier si l'invitation a déjà été utilisée
  if (invitation.used) {
    return res.status(400).json({ error: "Invitation déjà utilisée" });
  }
  
  // Récupérer les informations du site
  const site = siteQueries.findById.get(invitation.site_id);
  if (!site) {
    return res.status(404).json({ error: "Site introuvable" });
  }
  
  // Vérifier si l'utilisateur est le propriétaire du site
  if (site.user_id === userId) {
    const user = userQueries.findById.get(userId);
    return res.json({ 
      success: true, 
      message: "Vous êtes déjà le propriétaire de ce site. Aucune action nécessaire.",
      siteHash: site.hash,
      userHash: user.hash
    });
  }
  
  // Vérifier si l'utilisateur est déjà administrateur invité
  const adminCheck = siteAdminQueries.isAdmin.get(site.id, userId);
  if (adminCheck && adminCheck.count > 0) {
    const user = userQueries.findById.get(userId);
    return res.json({ 
      success: true, 
      message: "Vous êtes déjà administrateur de ce site.",
      siteHash: site.hash,
      userHash: user.hash
    });
  }
  
  try {
    // Ajouter l'utilisateur comme administrateur
    siteAdminQueries.create.run(site.id, userId);
    
    // Marquer l'invitation comme utilisée
    invitationQueries.markAsUsed.run(userId, token);
    
    // Récupérer le hash de l'utilisateur
    const user = userQueries.findById.get(userId);
    
    res.json({
      success: true,
      message: "Invitation acceptée avec succès !",
      siteHash: site.hash,
      userHash: user.hash
    });
  } catch (error) {
    console.error("Erreur lors de l'acceptation de l'invitation:", error);
    res.status(500).json({ error: "Erreur lors de l'acceptation de l'invitation" });
  }
});

// Lister les administrateurs d'un site
app.get("/admin/:hashUser/sites/:hashSite/admins", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
  try {
    const site = req.site;
    
    // Seul le propriétaire peut voir les administrateurs
    if (!req.isOwner) {
      return res.status(403).json({ error: "Seul le propriétaire peut voir les administrateurs" });
    }
    
    // Récupérer les administrateurs invités
    const invitedAdmins = siteAdminQueries.findBySiteId.all(site.id);
    
    // Récupérer le propriétaire
    const owner = userQueries.findById.get(site.user_id);
    
    // Combiner le propriétaire et les administrateurs invités
    const allAdmins = owner ? [owner, ...invitedAdmins] : invitedAdmins;
    
    res.json({
      success: true,
      admins: allAdmins
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des administrateurs:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des administrateurs"
    });
  }
});

// Retirer un administrateur d'un site
app.delete("/admin/:hashUser/sites/:hashSite/admins/:adminId", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
  try {
    const site = req.site;
    const adminId = parseInt(req.params.adminId);
    
    // Seul le propriétaire peut retirer des administrateurs
    if (!req.isOwner) {
      return res.status(403).json({ error: "Seul le propriétaire peut retirer des administrateurs" });
    }
    
    // Ne pas permettre de retirer le propriétaire
    if (site.user_id === adminId) {
      return res.status(400).json({ error: "Impossible de retirer le propriétaire du site" });
    }
    
    // Retirer l'administrateur
    siteAdminQueries.remove.run(site.id, adminId);
    
    res.json({
      success: true
    });
  } catch (error) {
    console.error("Erreur lors du retrait de l'administrateur:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du retrait de l'administrateur"
    });
  }
});

app.listen(3000, () => console.log("QR Dynamic running on port 3000"));

