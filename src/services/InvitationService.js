/**
 * Service pour la gestion des invitations de sites
 * Gère la création, acceptation, suppression et validation des invitations
 */

const { Invitation, Site, SiteAdmin, User } = require('../models');
const { generateInvitationToken } = require('../../utils/hash');

class InvitationService {
  /**
   * Créer une nouvelle invitation pour un site
   * @param {number} siteId - ID du site
   * @param {number} createdBy - ID de l'utilisateur créateur
   * @param {number} daysUntilExpiry - Nombre de jours avant expiration (défaut: 30)
   * @returns {Object} { token, expiresAt }
   */
  static createInvitation(siteId, createdBy, daysUntilExpiry = 30) {
    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysUntilExpiry);

    Invitation.create.run(
      siteId,
      createdBy,
      token,
      expiresAt.toISOString()
    );

    return {
      token,
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Construire l'URL complète d'une invitation
   * @param {Object} req - Objet request Express
   * @param {string} token - Token de l'invitation
   * @returns {string} URL complète de l'invitation
   */
  static buildInvitationUrl(req, token) {
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    return `${protocol}://${host}/invite/${token}`;
  }

  /**
   * Valider une invitation par token
   * @param {string} token - Token de l'invitation
   * @returns {Object} { invitation, site }
   * @throws {Error} Si l'invitation est invalide, expirée ou déjà utilisée
   */
  static validateInvitation(token) {
    const invitation = Invitation.findByToken.get(token);

    if (!invitation) {
      throw new Error("Invitation introuvable");
    }

    // Vérifier si l'invitation a expiré
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (now > expiresAt) {
      throw new Error("Invitation expirée");
    }

    // Vérifier si l'invitation a déjà été utilisée
    if (invitation.used) {
      throw new Error("Invitation déjà utilisée");
    }

    // Récupérer les informations du site
    const site = Site.findById.get(invitation.site_id);
    if (!site) {
      throw new Error("Site introuvable");
    }

    return { invitation, site };
  }

  /**
   * Accepter une invitation pour un utilisateur
   * @param {string} token - Token de l'invitation
   * @param {number} userId - ID de l'utilisateur qui accepte
   * @returns {Object} { siteHash, userHash, message }
   */
  static acceptInvitation(token, userId) {
    const { invitation, site } = this.validateInvitation(token);

    // Vérifier si l'utilisateur est le propriétaire du site
    if (site.user_id === userId) {
      const user = User.findById.get(userId);
      return {
        siteHash: site.hash,
        userHash: user.hash,
        message: "Vous êtes déjà le propriétaire de ce site. Aucune action nécessaire."
      };
    }

    // Vérifier si l'utilisateur est déjà administrateur invité
    const adminCheck = SiteAdmin.isAdmin.get(site.id, userId);
    if (adminCheck && adminCheck.count > 0) {
      const user = User.findById.get(userId);
      return {
        siteHash: site.hash,
        userHash: user.hash,
        message: "Vous êtes déjà administrateur de ce site."
      };
    }

    // Ajouter l'utilisateur comme administrateur
    SiteAdmin.create.run(site.id, userId);

    // Marquer l'invitation comme utilisée
    Invitation.markAsUsed.run(userId, token);

    // Récupérer le hash de l'utilisateur
    const user = User.findById.get(userId);

    return {
      siteHash: site.hash,
      userHash: user.hash,
      message: "Invitation acceptée avec succès ! Vous êtes maintenant administrateur de ce site."
    };
  }

  /**
   * Récupérer les invitations actives d'un site
   * @param {number} siteId - ID du site
   * @returns {Array} Liste des invitations actives
   */
  static getActiveInvitations(siteId) {
    return Invitation.findActiveBySiteId.all(siteId);
  }

  /**
   * Supprimer une invitation
   * @param {number} invitationId - ID de l'invitation
   * @param {number} siteId - ID du site (vérification)
   * @param {number} createdBy - ID du créateur (vérification de sécurité)
   */
  static deleteInvitation(invitationId, siteId, createdBy) {
    // Vérifier que l'invitation appartient bien au site
    const allInvitations = Invitation.findBySiteId.all(siteId);
    const invitation = allInvitations.find(inv => inv.id === invitationId);

    if (!invitation) {
      throw new Error("Invitation introuvable");
    }

    // Supprimer l'invitation
    Invitation.delete.run(invitationId, createdBy);
  }

  /**
   * Récupérer les administrateurs d'un site (propriétaire + co-admins)
   * @param {number} siteId - ID du site
   * @returns {Array} Liste des administrateurs
   */
  static getSiteAdmins(siteId) {
    const site = Site.findById.get(siteId);
    if (!site) {
      throw new Error("Site introuvable");
    }

    // Récupérer les administrateurs invités
    const invitedAdmins = SiteAdmin.findBySiteId.all(siteId);

    // Récupérer le propriétaire
    const owner = User.findById.get(site.user_id);

    // Combiner le propriétaire et les administrateurs invités
    return owner ? [owner, ...invitedAdmins] : invitedAdmins;
  }

  /**
   * Retirer un administrateur d'un site
   * @param {number} siteId - ID du site
   * @param {number} adminId - ID de l'administrateur à retirer
   */
  static removeAdmin(siteId, adminId) {
    const site = Site.findById.get(siteId);
    if (!site) {
      throw new Error("Site introuvable");
    }

    // Ne pas permettre de retirer le propriétaire
    if (site.user_id === adminId) {
      throw new Error("Impossible de retirer le propriétaire du site");
    }

    // Retirer l'administrateur
    SiteAdmin.remove.run(siteId, adminId);
  }
}

module.exports = InvitationService;

