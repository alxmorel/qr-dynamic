/**
 * Modèle SiteAdmin - Gestion des administrateurs de sites (co-admins)
 */

const db = require('./database');

/**
 * Requêtes préparées pour les administrateurs de sites
 */
const SiteAdmin = {
  /**
   * Ajouter un administrateur à un site (ou ignorer si déjà présent)
   * @param {number} siteId - ID du site
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object} Résultat de l'insertion
   */
  create: db.prepare(`
    INSERT OR IGNORE INTO site_admins (site_id, user_id)
    VALUES (?, ?)
  `),
  
  /**
   * Trouver tous les administrateurs d'un site
   * @param {number} siteId - ID du site
   * @returns {Array} Liste des utilisateurs administrateurs
   */
  findBySiteId: db.prepare(`
    SELECT u.* FROM site_admins sa
    JOIN users u ON sa.user_id = u.id
    WHERE sa.site_id = ?
  `),
  
  /**
   * Trouver une relation admin spécifique
   * @param {number} siteId - ID du site
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object|null} Relation admin ou null
   */
  findBySiteIdAndUserId: db.prepare(`
    SELECT * FROM site_admins WHERE site_id = ? AND user_id = ?
  `),
  
  /**
   * Vérifier si un utilisateur est administrateur d'un site
   * @param {number} siteId - ID du site
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object} Objet avec propriété count (0 ou 1)
   */
  isAdmin: db.prepare(`
    SELECT COUNT(*) as count FROM site_admins 
    WHERE site_id = ? AND user_id = ?
  `),
  
  /**
   * Retirer un administrateur d'un site
   * @param {number} siteId - ID du site
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object} Résultat de la suppression
   */
  remove: db.prepare(`
    DELETE FROM site_admins WHERE site_id = ? AND user_id = ?
  `),
  
  /**
   * Trouver tous les sites où un utilisateur est administrateur
   * (propriétaire ou co-admin invité)
   * @param {number} userId - ID de l'utilisateur
   * @returns {Array} Liste des sites
   */
  findSitesByUserId: db.prepare(`
    SELECT DISTINCT s.* 
    FROM sites s
    LEFT JOIN site_admins sa ON s.id = sa.site_id
    WHERE s.user_id = ? OR sa.user_id = ?
    ORDER BY s.updated_at DESC
  `)
};

module.exports = SiteAdmin;

