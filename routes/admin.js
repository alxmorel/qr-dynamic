const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { userQueries, siteQueries, contentQueries, siteAdminQueries } = require('../database');
const { generateUniqueHash, generateUniqueUserHash } = require('../utils/hash');
const { hashPassword } = require('../utils/auth');
const { requireAuth, requireUserHash, requireSiteOwner } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * Normalise les chemins d'URL (remplace les backslashes par des slashes)
 */
function normalizePath(pathStr) {
  if (pathStr && pathStr.startsWith("/uploads/")) {
    return pathStr.replace(/\\/g, '/');
  }
  return pathStr;
}

// Route de compatibilité pour les anciennes URLs /admin/:hash
// Redirige vers la nouvelle structure /admin/:hashUser/sites/:hashSite
router.get("/:hash", requireAuth, requireSiteOwner, (req, res) => {
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
router.get("/:hashUser/sites", requireAuth, requireUserHash, (req, res) => {
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
router.post("/:hashUser/sites", requireAuth, requireUserHash, async (req, res) => {
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
router.delete("/:hashUser/sites/:hashSite", requireAuth, requireUserHash, requireSiteOwner, async (req, res) => {
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
router.get("/:hashUser/sites/:hashSite", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
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
  
  // Normaliser les chemins d'URL
  if (displayContent.backgroundImage) {
    displayContent.backgroundImage = normalizePath(displayContent.backgroundImage);
  }
  if (displayContent.favicon) {
    displayContent.favicon = normalizePath(displayContent.favicon);
  }
  if (displayContent.value) {
    displayContent.value = normalizePath(displayContent.value);
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
router.post("/:hashUser/sites/:hashSite", requireAuth, requireUserHash, requireSiteOwner, upload.fields([
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

module.exports = router;

