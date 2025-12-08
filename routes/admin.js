const express = require('express');
const router = express.Router();
const { User } = require('../src/models');
const { generateUniqueUserHash } = require('../utils/hash');
const { requireAuth, requireUserHash, requireSiteOwner } = require('../middleware/auth');
const upload = require('../middleware/upload');
const SiteService = require('../src/services/SiteService');
const ContentService = require('../src/services/ContentService');
const TemplateService = require('../src/services/TemplateService');

// Route de compatibilité pour les anciennes URLs /admin/:hash
// Redirige vers la nouvelle structure /admin/:hashUser/sites/:hashSite
router.get("/:hash", requireAuth, requireSiteOwner, (req, res) => {
  const site = req.site;
  const user = User.findById.get(site.user_id);
  
  // S'assurer que l'utilisateur a un hash
  if (!user.hash) {
    const userHash = generateUniqueUserHash();
    User.updateHash.run(userHash, user.id);
    user.hash = userHash;
  }
  
  res.redirect(`/admin/${user.hash}/sites/${site.hash}`);
});

// Liste des sites d'un utilisateur (protégée)
router.get("/:hashUser/sites", requireAuth, requireUserHash, (req, res) => {
  const user = req.user;
  const sites = SiteService.getUserSitesWithTitles(user.id);
  
  res.render("sites-list", {
    sites: sites,
    userHash: req.userHash,
    success: req.query.success || null,
    error: req.query.error || null,
    content: null
  });
});

// Créer un nouveau site (protégée)
router.post("/:hashUser/sites", requireAuth, requireUserHash, async (req, res) => {
  try {
    const user = req.user;
    const { siteHash, siteId } = SiteService.createSite(user.id);
    
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
    
    SiteService.deleteSite(site.id, user.id, site.hash);
    
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
  const content = ContentService.getSiteContent(site.id);
  const publicUrl = SiteService.buildPublicUrl(req, site.hash);
  const qrCodeConfig = SiteService.getQrCodeConfig(site);
  
  res.render("admin", { 
    content: content,
    site: site,
    userHash: req.userHash,
    success: req.query.success || null,
    publicPasswordEnabled: site.public_password_enabled ? true : false,
    publicPassword: site.public_password || null,
    publicUrl: publicUrl,
    isOwner: req.isOwner !== false,
    qrCodeConfig: qrCodeConfig
  });
});

// Mise à jour du contenu d'un site (protégée)
router.post("/:hashUser/sites/:hashSite", requireAuth, requireUserHash, requireSiteOwner, upload.fields([
  { name: "backgroundImageFile", maxCount: 1 },
  { name: "faviconFile", maxCount: 1 },
  { name: "contentImageFile", maxCount: 1 }
]), async (req, res) => {
  try {
    const site = req.site;
    const { Content } = require('../src/models');
    const existingContent = Content.findBySiteId.get(site.id);
    
    // Gérer le mot de passe public
    const publicPasswordEnabled = req.body.publicPasswordEnabled === "on" || req.body.publicPasswordEnabled === "true";
    await SiteService.updatePublicPassword(site.id, publicPasswordEnabled, req.body.publicPassword);
    
    // Préparer la mise à jour du contenu avec gestion des fichiers
    const newContent = ContentService.prepareContentUpdate(
      req.body,
      req.files,
      existingContent,
      site.user_id,
      site.hash
    );
    
    // Sauvegarder le contenu
    ContentService.saveContent(site.id, newContent);
    
    // Sauvegarder la configuration QR code si elle est fournie
    if (req.body.qrCodeConfig) {
      try {
        const qrCodeConfig = JSON.parse(req.body.qrCodeConfig);
        SiteService.updateQrCodeConfig(site.id, qrCodeConfig);
      } catch (e) {
        console.error('Erreur lors de la sauvegarde de la configuration QR code:', e);
      }
    }
    
    const user = User.findById.get(site.user_id);
    res.redirect(`/admin/${user.hash}/sites/${site.hash}?success=true`);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du site:", error);
    res.status(500).redirect(`/admin/${req.userHash}/sites/${req.params.hashSite}?error=true`);
  }
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
    
    SiteService.updateQrCodeConfig(site.id, qrCodeConfig);
    
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
    const templates = TemplateService.getUserTemplates(user.id);
    res.json(templates);
  } catch (error) {
    console.error("Erreur lors de la récupération des templates:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des templates" });
  }
});

// Récupérer un template spécifique
router.get("/:hashUser/templates/:templateId", requireAuth, requireUserHash, (req, res) => {
  try {
    const user = req.user;
    const templateId = TemplateService.validateTemplateId(req.params.templateId);
    const template = TemplateService.getTemplateById(templateId, user.id);
    
    if (!template) {
      return res.status(404).json({ error: "Template non trouvé" });
    }
    
    res.json(template);
  } catch (error) {
    if (error.message.includes('ID de template invalide')) {
      return res.status(400).json({ error: error.message, received: req.params.templateId });
    }
    console.error("Erreur lors de la récupération du template:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du template" });
  }
});

// Créer un nouveau template
router.post("/:hashUser/templates", requireAuth, requireUserHash, (req, res) => {
  try {
    const user = req.user;
    const { id, message } = TemplateService.createTemplate(user.id, req.body);
    
    res.json({
      success: true,
      id: id,
      message: message
    });
  } catch (error) {
    if (error.message.includes('nom du template')) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Erreur lors de la création du template:", error);
    res.status(500).json({ error: "Erreur lors de la création du template" });
  }
});

// Supprimer un template
router.delete("/:hashUser/templates/:templateId", requireAuth, requireUserHash, (req, res) => {
  try {
    const user = req.user;
    const templateId = TemplateService.validateTemplateId(req.params.templateId);
    
    TemplateService.deleteTemplate(templateId, user.id);
    
    res.json({ success: true, message: "Template supprimé avec succès" });
  } catch (error) {
    if (error.message.includes('ID de template invalide')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('non trouvé')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('template par défaut')) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Erreur lors de la suppression du template:", error);
    res.status(500).json({ error: "Erreur lors de la suppression du template" });
  }
});

module.exports = router;

