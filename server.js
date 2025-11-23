const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const multer = require("multer");
require("dotenv").config();

// Imports pour la nouvelle architecture
const { userQueries, siteQueries, contentQueries } = require("./database");
const { createUserWithSite, authenticateUser } = require("./utils/auth");

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
    // Si on a un hash dans les paramètres, organiser par user_id/site_hash
    let uploadDir = "./uploads";
    if (req.params && req.params.hash) {
      const site = siteQueries.findByHash.get(req.params.hash);
      if (site && req.session.user_id === site.user_id) {
        uploadDir = path.join("./uploads", String(site.user_id), req.params.hash);
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
    // Déterminer le préfixe selon le type de fichier
    if (file.fieldname === "faviconFile") {
      cb(null, "favicon-" + uniqueSuffix + path.extname(file.originalname));
    } else {
      cb(null, "background-" + uniqueSuffix + path.extname(file.originalname));
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

// Middleware pour vérifier si l'utilisateur est connecté
function requireAuth(req, res, next) {
  if (req.session.user_id) {
    return next();
  }
  res.redirect("/login");
}

// Middleware pour vérifier que l'utilisateur est propriétaire du site
function requireSiteOwner(req, res, next) {
  const hash = req.params.hash;
  if (!hash) {
    return res.status(400).send("Hash manquant");
  }
  
  const site = siteQueries.findByHash.get(hash);
  if (!site) {
    return res.status(404).send("Site introuvable");
  }
  
  if (site.user_id !== req.session.user_id) {
    return res.status(403).send("Accès interdit : vous n'êtes pas propriétaire de ce site");
  }
  
  req.site = site;
  next();
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
  // Si l'utilisateur est connecté, rediriger vers son dashboard ou premier site
  if (req.session.user_id) {
    const sites = siteQueries.findByUserId.all(req.session.user_id);
    if (sites.length > 0) {
      return res.redirect(`/admin/${sites[0].hash}`);
    }
  }
  // Sinon, afficher la page d'accueil avec liens vers login/register
  res.render("home", { user: getCurrentUser(req) });
});

// Page d'inscription
app.get("/register", (req, res) => {
  if (req.session.user_id) {
    // Si déjà connecté, rediriger vers le premier site
    const sites = siteQueries.findByUserId.all(req.session.user_id);
    if (sites.length > 0) {
      return res.redirect(`/admin/${sites[0].hash}`);
    }
    return res.redirect("/");
  }
  res.render("register", { error: null });
});

// Traitement de l'inscription
app.post("/register", async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.render("register", { error: "Tous les champs sont requis" });
    }
    
    if (password !== confirmPassword) {
      return res.render("register", { error: "Les mots de passe ne correspondent pas" });
    }
    
    if (password.length < 6) {
      return res.render("register", { error: "Le mot de passe doit contenir au moins 6 caractères" });
    }
    
    // Créer l'utilisateur et son site
    const { user, site } = await createUserWithSite(username, email, password);
    
    // Créer la session
    req.session.user_id = user.id;
    
    // Rediriger vers l'interface d'administration du site créé
    res.redirect(`/admin/${site.hash}`);
  } catch (error) {
    res.render("register", { error: error.message });
  }
});

// Page de connexion
app.get("/login", (req, res) => {
  if (req.session.user_id) {
    // Si déjà connecté, rediriger vers le premier site
    const sites = siteQueries.findByUserId.all(req.session.user_id);
    if (sites.length > 0) {
      return res.redirect(`/admin/${sites[0].hash}`);
    }
    return res.redirect("/");
  }
  res.render("login", { error: null, success: req.query.success || null });
});

// Traitement de la connexion
app.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.render("login", { error: "Email/username et mot de passe requis" });
    }
    
    const user = await authenticateUser(identifier, password);
    
    if (!user) {
      return res.render("login", { error: "Identifiants incorrects" });
    }
    
    // Créer la session
    req.session.user_id = user.id;
    
    // Rediriger vers le premier site de l'utilisateur
    const sites = siteQueries.findByUserId.all(user.id);
    if (sites.length > 0) {
      return res.redirect(`/admin/${sites[0].hash}`);
    }
    
    // Si pas de site, rediriger vers la page d'accueil
    res.redirect("/");
  } catch (error) {
    res.render("login", { error: "Une erreur est survenue lors de la connexion" });
  }
});

// Déconnexion
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erreur lors de la déconnexion:", err);
    }
    res.redirect("/");
  });
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
  
  // Charger le contenu du site
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
      }
    });
  }
  
  // Convertir les URLs YouTube en format embed si nécessaire
  if (content.type === "video" && content.value) {
    content.value = convertYouTubeUrl(content.value);
  }
  // Convertir les URLs Spotify en format embed si nécessaire
  if (content.type === "embed" && content.value) {
    content.value = convertSpotifyUrl(content.value);
  }
  
  res.render("index", { content });
});

// Page admin pour un site spécifique (protégée)
app.get("/admin/:hash", requireAuth, requireSiteOwner, (req, res) => {
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
  
  res.render("admin", { 
    content: displayContent,
    site: site,
    success: req.query.success || null
  });
});

// Mise à jour du contenu d'un site (protégée)
app.post("/admin/:hash", requireAuth, requireSiteOwner, upload.fields([
  { name: "backgroundImageFile", maxCount: 1 },
  { name: "faviconFile", maxCount: 1 }
]), (req, res) => {
  const site = req.site;
  const existingContent = contentQueries.findBySiteId.get(site.id);
  
  const newContent = {
    type: req.body.type || existingContent?.type || "text",
    value: req.body.value || existingContent?.value || "",
    title: req.body.title || existingContent?.title || "Mon site",
    backgroundColor: req.body.backgroundColor || existingContent?.backgroundColor || "#faf6ff",
    backgroundImage: existingContent?.backgroundImage || null,
    cardBackgroundColor: req.body.cardBackgroundColorValue || req.body.cardBackgroundColor || existingContent?.cardBackgroundColor || "#ffffff",
    favicon: existingContent?.favicon || null
  };

  // Gérer l'upload de l'icône
  if (req.files && req.files.faviconFile && req.files.faviconFile[0]) {
    // Construire le chemin relatif depuis la racine
    const relativePath = path.join("/uploads", String(site.user_id), site.hash, req.files.faviconFile[0].filename);
    
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
    // Construire le chemin relatif depuis la racine
    const relativePath = path.join("/uploads", String(site.user_id), site.hash, req.files.backgroundImageFile[0].filename);
    
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
  
  res.redirect(`/admin/${site.hash}?success=true`);
});

app.listen(3000, () => console.log("QR Dynamic running on port 3000"));

