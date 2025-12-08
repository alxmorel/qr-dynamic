/**
 * Modèle Invitation - Gestion des invitations de sites
 */

const db = require('./database');

/**
 * Requêtes préparées pour les invitations
 */
const Invitation = {
  /**
   * Créer une nouvelle invitation
   * @param {number} siteId - ID du site
   * @param {number} createdBy - ID de l'utilisateur créateur
   * @param {string} token - Token unique de l'invitation
   * @param {string} expiresAt - Date d'expiration (ISO string)
   * @returns {Object} Résultat de l'insertion avec lastInsertRowid
   */
  create: db.prepare(`
    INSERT INTO site_invitations (site_id, created_by, token, expires_at)
    VALUES (?, ?, ?, ?)
  `),
  
  /**
   * Trouver une invitation par token
   * @param {string} token - Token de l'invitation
   * @returns {Object|null} Invitation ou null
   */
  findByToken: db.prepare(`
    SELECT * FROM site_invitations WHERE token = ?
  `),
  
  /**
   * Trouver toutes les invitations d'un site
   * @param {number} siteId - ID du site
   * @returns {Array} Liste des invitations
   */
  findBySiteId: db.prepare(`
    SELECT * FROM site_invitations 
    WHERE site_id = ? 
    ORDER BY created_at DESC
  `),
  
  /**
   * Trouver les invitations actives d'un site (non utilisées et non expirées)
   * @param {number} siteId - ID du site
   * @returns {Array} Liste des invitations actives
   */
  findActiveBySiteId: db.prepare(`
    SELECT * FROM site_invitations 
    WHERE site_id = ? 
    AND used = 0
    AND expires_at > datetime('now')
    ORDER BY created_at DESC
  `),
  
  /**
   * Marquer une invitation comme utilisée
   * @param {number} userId - ID de l'utilisateur qui a utilisé l'invitation
   * @param {string} token - Token de l'invitation
   * @returns {Object} Résultat de la mise à jour
   */
  markAsUsed: db.prepare(`
    UPDATE site_invitations 
    SET used = 1, used_by = ?, used_at = CURRENT_TIMESTAMP
    WHERE token = ? AND used = 0
  `),
  
  /**
   * Supprimer une invitation
   * @param {number} id - ID de l'invitation
   * @param {number} createdBy - ID du créateur (vérification de sécurité)
   * @returns {Object} Résultat de la suppression
   */
  delete: db.prepare(`
    DELETE FROM site_invitations WHERE id = ? AND created_by = ?
  `)
};

module.exports = Invitation;

