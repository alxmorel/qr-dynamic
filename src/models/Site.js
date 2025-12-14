/**
 * Modèle Site - Gestion des sites
 */

const db = require('./database');

/**
 * Requêtes préparées pour les sites
 */
const Site = {
  /**
   * Créer un nouveau site
   * @param {string} hash - Hash unique du site
   * @param {number} userId - ID du propriétaire
   * @returns {Object} Résultat de l'insertion avec lastInsertRowid
   */
  create: db.prepare(`
    INSERT INTO sites (hash, user_id)
    VALUES (?, ?)
  `),
  
  /**
   * Trouver un site par hash
   * @param {string} hash - Hash du site
   * @returns {Object|null} Site ou null
   */
  findByHash: db.prepare(`
    SELECT * FROM sites WHERE hash = ?
  `),
  
  /**
   * Trouver un site par ID
   * @param {number} id - ID du site
   * @returns {Object|null} Site ou null
   */
  findById: db.prepare(`
    SELECT * FROM sites WHERE id = ?
  `),
  
  /**
   * Trouver tous les sites d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @returns {Array} Liste des sites
   */
  findByUserId: db.prepare(`
    SELECT * FROM sites WHERE user_id = ?
  `),
  
  /**
   * Trouver un site par hash et ID utilisateur
   * @param {string} hash - Hash du site
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object|null} Site ou null
   */
  findByHashAndUserId: db.prepare(`
    SELECT * FROM sites WHERE hash = ? AND user_id = ?
  `),
  
  /**
   * Mettre à jour le timestamp d'un site
   * @param {number} id - ID du site
   * @returns {Object} Résultat de la mise à jour
   */
  updateTimestamp: db.prepare(`
    UPDATE sites SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),
  
  /**
   * Mettre à jour le mot de passe public d'un site
   * @param {number} enabled - 1 si activé, 0 sinon
   * @param {string|null} passwordHash - Hash du mot de passe
   * @param {string|null} passwordPlain - Mot de passe en clair (pour affichage admin)
   * @param {number} id - ID du site
   * @returns {Object} Résultat de la mise à jour
   */
  updatePublicPassword: db.prepare(`
    UPDATE sites 
    SET public_password_enabled = ?, 
        public_password_hash = ?,
        public_password = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  
  /**
   * Mettre à jour la configuration QR code d'un site
   * @param {string} config - Configuration JSON stringifiée
   * @param {number} id - ID du site
   * @returns {Object} Résultat de la mise à jour
   */
  updateQrCodeConfig: {
    run: (config, id) => {
      // Préparation paresseuse pour éviter les erreurs si la colonne n'existe pas encore
      // La requête sera préparée au premier appel, après que les migrations aient été exécutées
      if (!Site.updateQrCodeConfig._stmt) {
        Site.updateQrCodeConfig._stmt = db.prepare(`
          UPDATE sites 
          SET qr_code_config = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
      }
      return Site.updateQrCodeConfig._stmt.run(config, id);
    }
  },
  
  /**
   * Supprimer un site
   * @param {number} id - ID du site
   * @param {number} userId - ID du propriétaire (vérification de sécurité)
   * @returns {Object} Résultat de la suppression
   */
  delete: db.prepare(`
    DELETE FROM sites WHERE id = ? AND user_id = ?
  `)
};

module.exports = Site;

