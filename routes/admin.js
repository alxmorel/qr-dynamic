const express = require('express');
const router = express.Router();
const { User, Site, Analytics } = require('../src/models');
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

// Route Dashboard (protégée)
router.get("/:hashUser/sites/:hashSite/dashboard", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
  const site = req.site;
  const userHash = req.userHash;
  
  try {
    // Gérer les filtres de période
    let startDate, endDate, periodLabel;
    const period = req.query.period || '30'; // Par défaut 30 jours
    const customStart = req.query.start;
    const customEnd = req.query.end;
    
    // Vérifier d'abord si c'est une période personnalisée (period doit être 'custom' ET avoir start/end)
    if (period === 'custom' && customStart && customEnd) {
      // Période personnalisée
      startDate = customStart;
      endDate = customEnd;
      periodLabel = `Du ${new Date(customStart).toLocaleDateString('fr-FR')} au ${new Date(customEnd).toLocaleDateString('fr-FR')}`;
    } else {
      // Période prédéfinie (ignorer customStart et customEnd si period n'est pas 'custom')
      const days = parseInt(period) || 30;
      endDate = new Date().toISOString().split('T')[0]; // Aujourd'hui
      const start = new Date();
      start.setDate(start.getDate() - days);
      startDate = start.toISOString().split('T')[0];
      
      if (days === 7) periodLabel = '7 derniers jours';
      else if (days === 30) periodLabel = '30 derniers jours';
      else if (days === 90) periodLabel = '90 derniers jours';
      else periodLabel = `${days} derniers jours`;
    }
    
    // Gérer les filtres interactifs
    const filters = {};
    if (req.query.filterHour !== undefined && req.query.filterHour !== '') {
      filters.hour = parseInt(req.query.filterHour);
    }
    if (req.query.filterDate) {
      filters.date = req.query.filterDate;
    }
    if (req.query.filterSource) {
      filters.source = req.query.filterSource;
    }
    if (req.query.filterBrowser) {
      filters.browser = req.query.filterBrowser;
    }
    if (req.query.filterDevice) {
      filters.device = req.query.filterDevice;
    }
    
    // Récupérer les statistiques avec période et filtres
    const stats = Analytics.getSiteStatsWithPeriod(site.id, startDate, endDate, filters);
    const ctaClicks = Analytics.getCtaClicksWithPeriod(site.id, startDate, endDate, filters);
    const statsByBrowser = Analytics.getStatsByBrowserWithPeriod(site.id, startDate, endDate, filters);
    const statsByDevice = Analytics.getStatsByDeviceWithPeriod(site.id, startDate, endDate, filters);
    const recentVisits = Analytics.getRecentVisits.all(site.id, 10);
    const uniqueVsReturning = Analytics.getUniqueVsReturningWithPeriod(site.id, startDate, endDate, filters);
    const visitsByDay = Analytics.getVisitsByDayWithPeriod(site.id, startDate, endDate, filters);
    const visitsByHour = Analytics.getVisitsByHourWithPeriod(site.id, startDate, endDate, filters);
    const trafficSources = Analytics.getTrafficSourcesWithPeriod(site.id, startDate, endDate, filters);
    
    // Calculer les statistiques de la période précédente pour comparaison
    const previousPeriodStats = Analytics.getPreviousPeriodStatsForComparison(site.id, startDate, endDate);
    
    // Calculer le taux de conversion CTA
    const ctaConversionRate = stats?.total_visits > 0 
      ? ((ctaClicks?.total_clicks || 0) / stats.total_visits * 100).toFixed(2)
      : 0;
    
    // Calculer les tendances
    const currentVisits = stats?.total_visits || 0;
    const previousVisits = previousPeriodStats?.total_visits || 0;
    const visitsTrend = previousVisits > 0 
      ? (((currentVisits - previousVisits) / previousVisits) * 100).toFixed(1)
      : 0;
    
    const currentDuration = stats?.avg_duration || 0;
    const previousDuration = previousPeriodStats?.avg_duration || 0;
    const durationTrend = previousDuration > 0
      ? (((currentDuration - previousDuration) / previousDuration) * 100).toFixed(1)
      : 0;
    
    const currentBounce = stats?.bounce_rate || 0;
    const previousBounce = previousPeriodStats?.bounce_rate || 0;
    const bounceTrend = previousBounce > 0
      ? (((currentBounce - previousBounce) / previousBounce) * 100).toFixed(1)
      : 0;
    
    // Construire les URLs pour supprimer les filtres
    const baseUrl = `/admin/${userHash}/sites/${site.hash}/dashboard`;
    const urlParams = new URLSearchParams();
    if (period) urlParams.set('period', period);
    if (customStart && customEnd && period === 'custom') {
      urlParams.set('start', customStart);
      urlParams.set('end', customEnd);
    }
    
    const removeFilterUrl = (filterName) => {
      const params = new URLSearchParams(urlParams);
      Object.keys(filters).forEach(key => {
        const filterKey = 'filter' + key.charAt(0).toUpperCase() + key.slice(1);
        if (filterKey !== filterName) {
          params.set(filterKey, filters[key]);
        }
      });
      return `${baseUrl}?${params.toString()}`;
    };
    
    const clearAllFiltersUrl = `${baseUrl}?${urlParams.toString()}`;
    
    res.render("dashboard", {
      site: site,
      userHash: userHash,
      period: period,
      periodLabel: periodLabel,
      startDate: startDate,
      endDate: endDate,
      customStart: customStart || null,
      customEnd: customEnd || null,
      activeFilters: filters,
      removeFilterUrl: removeFilterUrl,
      clearAllFiltersUrl: clearAllFiltersUrl,
      stats: stats || {
        total_visits: 0,
        total_sessions: 0,
        avg_duration: 0,
        bounce_rate: 0,
        retention_rate: 0
      },
      ctaClicks: ctaClicks?.total_clicks || 0,
      ctaConversionRate: parseFloat(ctaConversionRate),
      uniqueVisitors: uniqueVsReturning?.unique_visitors || 0,
      returningVisitors: uniqueVsReturning?.returning_visitors || 0,
      statsByBrowser: statsByBrowser || [],
      statsByDevice: statsByDevice || [],
      recentVisits: recentVisits || [],
      visitsByDay: visitsByDay || [],
      visitsByHour: visitsByHour || [],
      trafficSources: trafficSources || [],
      trends: {
        visits: parseFloat(visitsTrend),
        duration: parseFloat(durationTrend),
        bounce: parseFloat(bounceTrend)
      },
      customStart: customStart || null,
      customEnd: customEnd || null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).render("dashboard", {
      site: site,
      userHash: userHash,
      period: '30',
      periodLabel: '30 derniers jours',
      stats: {
        total_visits: 0,
        total_sessions: 0,
        avg_duration: 0,
        bounce_rate: 0,
        retention_rate: 0
      },
      ctaClicks: 0,
      ctaConversionRate: 0,
      uniqueVisitors: 0,
      returningVisitors: 0,
      statsByBrowser: [],
      statsByDevice: [],
      recentVisits: [],
      visitsByDay: [],
      visitsByHour: [],
      trafficSources: [],
      trends: { visits: 0, duration: 0, bounce: 0 },
      error: "Erreur lors du chargement des statistiques"
    });
  }
});

// Mise à jour du contenu d'un site (protégée)
router.post("/:hashUser/sites/:hashSite", requireAuth, requireUserHash, requireSiteOwner, upload.fields([
  { name: "backgroundImageFile", maxCount: 1 },
  { name: "faviconFile", maxCount: 1 },
  { name: "contentImageFile", maxCount: 1 },
  { name: "contentPdfFile", maxCount: 1 }
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

