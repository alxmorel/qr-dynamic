const express = require('express');
const router = express.Router();
const { invitationQueries, siteQueries, contentQueries, siteAdminQueries, userQueries } = require('../database');
const { generateInvitationToken } = require('../utils/hash');
const { requireAuth, requireUserHash, requireSiteOwner } = require('../middleware/auth');

// Créer une invitation pour un site (seul le propriétaire peut créer)
router.post("/admin/:hashUser/sites/:hashSite/invitations", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
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
router.get("/admin/:hashUser/sites/:hashSite/invitations", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
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
router.delete("/admin/:hashUser/sites/:hashSite/invitations/:invitationId", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
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
router.get("/invite/:token", (req, res) => {
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
router.post("/invite/:token/accept", requireAuth, async (req, res) => {
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
router.get("/admin/:hashUser/sites/:hashSite/admins", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
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
router.delete("/admin/:hashUser/sites/:hashSite/admins/:adminId", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
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

module.exports = router;

