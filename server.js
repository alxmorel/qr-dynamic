const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const multer = require("multer");
require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Configuration de multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "./uploads";
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
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Mot de passe (vous pouvez aussi utiliser process.env.ADMIN_PASSWORD)
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!PASSWORD) {
  console.error("ERREUR: ADMIN_PASSWORD n'est pas défini dans le fichier .env");
  process.exit(1);
}

// Vérifier si l'utilisateur est connecté
function requireAuth(req, res, next) {
  if (req.session.authenticated) {
    return next();
  }
  res.redirect("/login");
}

function loadContent() {
  return JSON.parse(fs.readFileSync("./content.json", "utf8"));
}

function saveContent(data) {
  fs.writeFileSync("./content.json", JSON.stringify(data, null, 2));
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

// Page principale (celle du QR)
app.get("/", (req, res) => {
  const content = loadContent();
  // Convertir l'URL YouTube en format embed si nécessaire
  if (content.type === "video" && content.value) {
    content.value = convertYouTubeUrl(content.value);
  }
  // Convertir l'URL Spotify en format embed si nécessaire
  if (content.type === "embed" && content.value) {
    content.value = convertSpotifyUrl(content.value);
  }
  res.render("index", { content });
});

// Page de connexion
app.get("/login", (req, res) => {
  if (req.session.authenticated) {
    return res.redirect("/admin");
  }
  const content = loadContent();
  res.render("login", { error: null, content });
});

// Traitement de la connexion
app.post("/login", (req, res) => {
  if (req.body.password === PASSWORD) {
    req.session.authenticated = true;
    res.redirect("/admin");
  } else {
    const content = loadContent();
    res.render("login", { error: "Mot de passe incorrect", content });
  }
});

// Déconnexion
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// Page admin (protégée)
app.get("/admin", requireAuth, (req, res) => {
  const content = loadContent();
  // Initialiser les valeurs par défaut si elles n'existent pas
  if (!content.backgroundColor) {
    content.backgroundColor = "#faf6ff";
  }
  if (!content.backgroundImage) {
    content.backgroundImage = null;
  }
  if (!content.cardBackgroundColor) {
    content.cardBackgroundColor = "#ffffff";
  }
  res.render("admin", { content });
});

// Mise à jour du contenu (protégée)
app.post("/admin", requireAuth, upload.fields([
  { name: "backgroundImageFile", maxCount: 1 },
  { name: "faviconFile", maxCount: 1 }
]), (req, res) => {
  const content = loadContent();
  
  const newContent = {
    type: req.body.type || content.type,
    value: req.body.value || content.value,
    title: req.body.title || content.title,
    backgroundColor: req.body.backgroundColor || content.backgroundColor || "#faf6ff",
    backgroundImage: content.backgroundImage || null,
    cardBackgroundColor: req.body.cardBackgroundColorValue || req.body.cardBackgroundColor || content.cardBackgroundColor || "#ffffff",
    favicon: content.favicon || null
  };

  // Gérer l'upload de l'icône
  if (req.files && req.files.faviconFile && req.files.faviconFile[0]) {
    // Supprimer l'ancienne icône si elle existe
    if (content.favicon && content.favicon.startsWith("/uploads/")) {
      const oldFaviconPath = path.join("./uploads", path.basename(content.favicon));
      if (fs.existsSync(oldFaviconPath)) {
        fs.unlinkSync(oldFaviconPath);
      }
    }
    newContent.favicon = "/uploads/" + req.files.faviconFile[0].filename;
  } else if (req.body.removeFavicon === "true") {
    // Supprimer l'icône si demandé
    if (content.favicon && content.favicon.startsWith("/uploads/")) {
      const oldFaviconPath = path.join("./uploads", path.basename(content.favicon));
      if (fs.existsSync(oldFaviconPath)) {
        fs.unlinkSync(oldFaviconPath);
      }
    }
    newContent.favicon = null;
  } else {
    // Conserver l'icône existante
    newContent.favicon = content.favicon || null;
  }

  // Si une nouvelle image est uploadée
  if (req.files && req.files.backgroundImageFile && req.files.backgroundImageFile[0]) {
    // Supprimer l'ancienne image si elle existe
    if (content.backgroundImage && content.backgroundImage.startsWith("/uploads/")) {
      const oldImagePath = path.join("./uploads", path.basename(content.backgroundImage));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    newContent.backgroundImage = "/uploads/" + req.files.backgroundImageFile[0].filename;
  } else if (req.body.removeBackgroundImage === "true") {
    // Supprimer l'image de fond si demandé
    if (content.backgroundImage && content.backgroundImage.startsWith("/uploads/")) {
      const oldImagePath = path.join("./uploads", path.basename(content.backgroundImage));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    newContent.backgroundImage = null;
  } else {
    // Conserver l'image existante
    newContent.backgroundImage = content.backgroundImage || null;
  }

  saveContent(newContent);
  res.redirect("/admin?success=true");
});

app.listen(3000, () => console.log("QR Dynamic running on port 3000"));

