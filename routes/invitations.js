const express = require('express');
const router = express.Router();
const { Content } = require('../src/models');
const { requireAuth, requireUserHash, requireSiteOwner } = require('../middleware/auth');
const InvitationService = require('../src/services/InvitationService');

// Créer une invitation pour un site (seul le propriétaire peut créer)
router.post("/admin/:hashUser/sites/:hashSite/invitations", requireAuth, requireUserHash, requireSiteOwner, (req, res) => {
  try {
    const site = req.site;
    
    // Seul le propriétaire peut créer des invitations
    if (!req.isOwner) {
      return res.status(403).json({ error: "Seul le propriétaire peut créer des invitations" });
    }
    
    const { token, expiresAt } = InvitationService.createInvitation(site.id, req.session.user_id);
    const invitationUrl = InvitationService.buildInvitationUrl(req, token);
    
    res.json({
      success: true,
      token: token,
      invitationUrl: invitationUrl,
      expiresAt: expiresAt
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
    
    const invitations = InvitationService.getActiveInvitations(site.id);
    
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
    
    InvitationService.deleteInvitation(invitationId, site.id, req.session.user_id);
    
    res.json({
      success: true
    });
  } catch (error) {
    if (error.message.includes('introuvable')) {
      return res.status(404).json({ error: error.message });
    }
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
  
  try {
    // Valider l'invitation
    const { invitation, site } = InvitationService.validateInvitation(token);
    
    // Si l'utilisateur est déjà connecté, accepter directement l'invitation
    if (req.session.user_id) {
      try {
        const result = InvitationService.acceptInvitation(token, req.session.user_id);
        return res.render("invite-success", {
          message: result.message,
          siteHash: result.siteHash,
          userHash: result.userHash
        });
      } catch (error) {
        console.error("Erreur lors de l'acceptation de l'invitation:", error);
        return res.render("invite-error", {
          error: "Erreur",
          message: "Une erreur est survenue lors de l'acceptation de l'invitation."
        });
      }
    }
    
    // Si l'utilisateur n'est pas connecté, afficher la page d'invitation
    const content = Content.findBySiteId.get(site.id);
    const siteTitle = content ? content.title : "Site";
    
    res.render("invite", {
      token: token,
      siteTitle: siteTitle,
      siteHash: site.hash
    });
  } catch (error) {
    // Gérer les erreurs de validation
    let errorMessage = "Une erreur est survenue.";
    if (error.message.includes('introuvable')) {
      errorMessage = "Cette invitation n'existe pas ou a été supprimée.";
    } else if (error.message.includes('expirée')) {
      errorMessage = "Cette invitation a expiré. Veuillez demander une nouvelle invitation.";
    } else if (error.message.includes('déjà utilisée')) {
      errorMessage = "Cette invitation a déjà été utilisée.";
    }
    
    return res.render("invite-error", {
      error: error.message.split(':')[0] || "Erreur",
      message: errorMessage
    });
  }
});

// Accepter une invitation après connexion/inscription
router.post("/invite/:token/accept", requireAuth, async (req, res) => {
  const token = req.params.token;
  const userId = req.session.user_id;
  
  try {
    const result = InvitationService.acceptInvitation(token, userId);
    res.json({
      success: true,
      message: result.message,
      siteHash: result.siteHash,
      userHash: result.userHash
    });
  } catch (error) {
    if (error.message.includes('introuvable')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('expirée') || error.message.includes('déjà utilisée')) {
      return res.status(400).json({ error: error.message });
    }
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
    
    const admins = InvitationService.getSiteAdmins(site.id);
    
    res.json({
      success: true,
      admins: admins
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
    
    InvitationService.removeAdmin(site.id, adminId);
    
    res.json({
      success: true
    });
  } catch (error) {
    if (error.message.includes('propriétaire')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('introuvable')) {
      return res.status(404).json({ error: error.message });
    }
    console.error("Erreur lors du retrait de l'administrateur:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du retrait de l'administrateur"
    });
  }
});

module.exports = router;

