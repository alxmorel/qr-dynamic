const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { siteQueries } = require('../database');

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

module.exports = upload;

