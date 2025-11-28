const express = require('express');
const router = express.Router();
const { siteQueries, contentQueries } = require('../database');
const { verifyPassword } = require('../utils/auth');
const { convertYouTubeUrl, convertSpotifyUrl } = require('../utils/urlConverter');

/**
 * Normalise les chemins d'URL (remplace les backslashes par des slashes)
 */
function normalizePath(path) {
  if (path && path.startsWith("/uploads/")) {
    return path.replace(/\\/g, '/');
  }
  return path;
}

/**
 * Normalise le contenu d'un site (chemins et URLs)
 */
function normalizeContent(content) {
  if (!content) return content;
  
  if (content.backgroundImage) {
    content.backgroundImage = normalizePath(content.backgroundImage);
  }
  if (content.favicon) {
    content.favicon = normalizePath(content.favicon);
  }
  if (content.value) {
    content.value = normalizePath(content.value);
  }
  
  // Convertir les URLs YouTube en format embed si nécessaire
  if (content.type === "video" && content.value) {
    content.value = convertYouTubeUrl(content.value);
  }
  // Convertir les URLs Spotify en format embed si nécessaire
  if (content.type === "embed" && content.value) {
    content.value = convertSpotifyUrl(content.value);
  }
  
  return content;
}

// Route POST pour vérifier le mot de passe public
router.post("/:hash/verify-password", async (req, res) => {
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
router.get("/:hash/content", (req, res) => {
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
  
  // Normaliser le contenu
  normalizeContent(content);
  
  res.json({ content });
});

// Route pour afficher un site public (doit être en dernier pour ne pas capturer les autres routes)
router.get("/:hash", (req, res) => {
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
  
  // Normaliser le contenu
  normalizeContent(content);
  
  res.render("index", { 
    content,
    requiresPassword: false
  });
});

module.exports = router;

