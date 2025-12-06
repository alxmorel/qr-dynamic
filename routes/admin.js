const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { userQueries, siteQueries, contentQueries, siteAdminQueries, templateQueries } = require('../database');
const { generateUniqueHash, generateUniqueUserHash } = require('../utils/hash');
const { hashPassword } = require('../utils/auth');
const { encrypt, decrypt } = require('../utils/encryption');
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
  
  // Charger la configuration QR code depuis la base de données
  let qrCodeConfig = null;
  if (site.qr_code_config) {
    try {
      qrCodeConfig = JSON.parse(site.qr_code_config);
    } catch (e) {
      console.error('Erreur lors du parsing de la configuration QR code:', e);
      qrCodeConfig = null;
    }
  }
  
  const useLegacyView = req.query.legacy === '1' || req.query.view === 'legacy';
  res.render(useLegacyView ? "admin-legacy" : "admin", { 
    content: displayContent,
    site: site,
    userHash: req.userHash,
    success: req.query.success || null,
    publicPasswordEnabled: site.public_password_enabled ? true : false,
    publicPassword: site.public_password || null,
    publicUrl: publicUrl,
    isOwner: req.isOwner !== false, // true par défaut si le middleware requireSiteOwner a réussi
    qrCodeConfig: qrCodeConfig
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
  
  // Sauvegarder la configuration QR code si elle est fournie
  if (req.body.qrCodeConfig) {
    try {
      const qrCodeConfig = JSON.parse(req.body.qrCodeConfig);
      siteQueries.updateQrCodeConfig.run(JSON.stringify(qrCodeConfig), site.id);
    } catch (e) {
      console.error('Erreur lors de la sauvegarde de la configuration QR code:', e);
    }
  }
  
  const user = userQueries.findById.get(site.user_id);
  res.redirect(`/admin/${user.hash}/sites/${site.hash}?success=true`);
});

// Route API pour sauvegarder uniquement la configuration QR code (protégée)
router.post("/:hashUser/sites/:hashSite/qr-code-config", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
  const site = req.site;
  
  try {
    if (!req.body.config) {
      return res.status(400).json({ error: 'Configuration QR code manquante' });
    }
    
    const qrCodeConfig = typeof req.body.config === 'string' 
      ? JSON.parse(req.body.config) 
      : req.body.config;
    
    siteQueries.updateQrCodeConfig.run(JSON.stringify(qrCodeConfig), site.id);
    
    res.json({ success: true, message: 'Configuration QR code sauvegardée avec succès' });
  } catch (e) {
    console.error('Erreur lors de la sauvegarde de la configuration QR code:', e);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde de la configuration QR code' });
  }
});

// Routes API pour les templates de contenu (DOIT être défini AVANT les routes sites pour éviter les conflits)
// Liste des templates de l'utilisateur
router.get("/:hashUser/templates", requireAuth, requireUserHash, (req, res) => {
  try {
    const user = req.user;
    
    // Récupérer les templates de l'utilisateur et les templates par défaut
    const userTemplates = templateQueries.findByUserId.all(user.id);
    const defaultTemplates = templateQueries.findDefaultTemplates.all();
    
    // Combiner et formater les templates
    const allTemplates = [...defaultTemplates, ...userTemplates].map(template => ({
      id: template.id,
      name: template.name,
      type: template.type,
      title: template.title ? decrypt(template.title) : null,
      value: template.value ? decrypt(template.value) : null,
      backgroundColor: template.backgroundColor,
      cardBackgroundColor: template.cardBackgroundColor,
      is_default: template.is_default === 1,
      created_at: template.created_at
    }));
    
    res.json(allTemplates);
  } catch (error) {
    console.error("Erreur lors de la récupération des templates:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des templates" });
  }
});

// Récupérer un template spécifique
router.get("/:hashUser/templates/:templateId", requireAuth, requireUserHash, (req, res) => {
  try {
    const user = req.user;
    const templateIdParam = req.params.templateId;
    
    // Log pour debug
    console.log('Template ID reçu:', templateIdParam, 'Type:', typeof templateIdParam);
    
    const templateId = parseInt(templateIdParam, 10);
    
    if (isNaN(templateId) || templateIdParam === '' || templateIdParam === null || templateIdParam === undefined) {
      console.error('ID de template invalide:', templateIdParam);
      return res.status(400).json({ error: "ID de template invalide", received: templateIdParam });
    }
    
    const template = templateQueries.findById.get(templateId, user.id);
    
    // Vérifier si c'est un template par défaut ou si l'utilisateur en est propriétaire
    if (!template) {
      // Vérifier si c'est un template par défaut
      const defaultTemplates = templateQueries.findDefaultTemplates.all();
      const defaultTemplate = defaultTemplates.find(t => t.id === templateId);
      
      if (!defaultTemplate) {
        return res.status(404).json({ error: "Template non trouvé" });
      }
      
      // Retourner le template par défaut
      return res.json({
        id: defaultTemplate.id,
        name: defaultTemplate.name,
        type: defaultTemplate.type,
        title: defaultTemplate.title ? decrypt(defaultTemplate.title) : null,
        value: defaultTemplate.value ? decrypt(defaultTemplate.value) : null,
        backgroundColor: defaultTemplate.backgroundColor,
        cardBackgroundColor: defaultTemplate.cardBackgroundColor,
        backgroundImage: defaultTemplate.backgroundImage ? decrypt(defaultTemplate.backgroundImage) : null,
        favicon: defaultTemplate.favicon ? decrypt(defaultTemplate.favicon) : null,
        is_default: true
      });
    }
    
    // Déchiffrer les champs sensibles
    res.json({
      id: template.id,
      name: template.name,
      type: template.type,
      title: template.title ? decrypt(template.title) : null,
      value: template.value ? decrypt(template.value) : null,
      backgroundColor: template.backgroundColor,
      cardBackgroundColor: template.cardBackgroundColor,
      backgroundImage: template.backgroundImage ? decrypt(template.backgroundImage) : null,
      favicon: template.favicon ? decrypt(template.favicon) : null,
      is_default: template.is_default === 1
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du template:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du template" });
  }
});

// Créer un nouveau template
router.post("/:hashUser/templates", requireAuth, requireUserHash, (req, res) => {
  try {
    const user = req.user;
    const { name, type, value, title, backgroundColor, cardBackgroundColor, backgroundImage, favicon } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le nom du template est requis" });
    }
    
    // Chiffrer les champs sensibles
    const encryptedValue = value ? encrypt(value) : null;
    const encryptedTitle = title ? encrypt(title) : null;
    const encryptedBackgroundImage = backgroundImage ? encrypt(backgroundImage) : null;
    const encryptedFavicon = favicon ? encrypt(favicon) : null;
    
    // Créer le template
    const result = templateQueries.create.run(
      user.id,
      name.trim(),
      type || 'text',
      encryptedValue,
      encryptedTitle,
      backgroundColor || null,
      encryptedBackgroundImage,
      cardBackgroundColor || null,
      encryptedFavicon,
      0 // is_default = 0 pour les templates utilisateur
    );
    
    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: "Template créé avec succès"
    });
  } catch (error) {
    console.error("Erreur lors de la création du template:", error);
    res.status(500).json({ error: "Erreur lors de la création du template" });
  }
});

// Supprimer un template
router.delete("/:hashUser/templates/:templateId", requireAuth, requireUserHash, (req, res) => {
  try {
    const user = req.user;
    const templateId = parseInt(req.params.templateId);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ error: "ID de template invalide" });
    }
    
    // Vérifier que le template existe et appartient à l'utilisateur
    const template = templateQueries.findById.get(templateId, user.id);
    
    if (!template) {
      return res.status(404).json({ error: "Template non trouvé" });
    }
    
    // Ne pas permettre la suppression des templates par défaut
    if (template.is_default === 1) {
      return res.status(403).json({ error: "Impossible de supprimer un template par défaut" });
    }
    
    // Supprimer le template
    templateQueries.delete.run(templateId, user.id);
    
    res.json({ success: true, message: "Template supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du template:", error);
    res.status(500).json({ error: "Erreur lors de la suppression du template" });
  }
});

module.exports = router;

