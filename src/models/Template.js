/**
 * Modèle Template - Gestion des templates de contenu
 * Note: Les templates utilisent aussi le chiffrement pour certains champs
 */

const db = require('./database');
const { decrypt } = require('../../utils/encryption');

/**
 * Requêtes préparées pour les templates de contenu
 */
const Template = {
  /**
   * Créer un nouveau template
   * Note: Les valeurs sensibles doivent être chiffrées avant l'appel
   * @param {number} userId - ID de l'utilisateur propriétaire
   * @param {string} name - Nom du template
   * @param {string} type - Type de contenu
   * @param {string|null} value - Valeur (doit être chiffrée)
   * @param {string|null} title - Titre (doit être chiffré)
   * @param {string|null} backgroundColor - Couleur de fond
   * @param {string|null} backgroundImage - Image de fond (doit être chiffrée)
   * @param {string|null} cardBackgroundColor - Couleur de fond de la carte
   * @param {string|null} favicon - Favicon (doit être chiffré)
   * @param {number} isDefault - 1 si template par défaut, 0 sinon
   * @returns {Object} Résultat de l'insertion avec lastInsertRowid
   */
  create: db.prepare(`
    INSERT INTO content_templates (
      user_id, name, type, value, title, backgroundColor,
      backgroundImage, cardBackgroundColor, favicon, is_default
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  /**
   * Trouver tous les templates d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @returns {Array} Liste des templates (non déchiffrés)
   */
  findByUserId: db.prepare(`
    SELECT * FROM content_templates 
    WHERE user_id = ? 
    ORDER BY is_default DESC, created_at DESC
  `),
  
  /**
   * Trouver un template par ID
   * @param {number} id - ID du template
   * @param {number} userId - ID de l'utilisateur (vérification de sécurité)
   * @returns {Object|null} Template ou null
   */
  findById: db.prepare(`
    SELECT * FROM content_templates WHERE id = ? AND user_id = ?
  `),
  
  /**
   * Trouver tous les templates par défaut
   * @returns {Array} Liste des templates par défaut
   */
  findDefaultTemplates: db.prepare(`
    SELECT * FROM content_templates 
    WHERE is_default = 1 
    ORDER BY created_at ASC
  `),
  
  /**
   * Mettre à jour un template
   * Note: Les valeurs sensibles doivent être chiffrées avant l'appel
   * @param {string} name - Nom du template
   * @param {string} type - Type de contenu
   * @param {string|null} value - Valeur (doit être chiffrée)
   * @param {string|null} title - Titre (doit être chiffré)
   * @param {string|null} backgroundColor - Couleur de fond
   * @param {string|null} backgroundImage - Image de fond (doit être chiffrée)
   * @param {string|null} cardBackgroundColor - Couleur de fond de la carte
   * @param {string|null} favicon - Favicon (doit être chiffré)
   * @param {number} id - ID du template
   * @param {number} userId - ID de l'utilisateur (vérification de sécurité)
   * @returns {Object} Résultat de la mise à jour
   */
  update: db.prepare(`
    UPDATE content_templates SET
      name = ?,
      type = ?,
      value = ?,
      title = ?,
      backgroundColor = ?,
      backgroundImage = ?,
      cardBackgroundColor = ?,
      favicon = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `),
  
  /**
   * Supprimer un template
   * @param {number} id - ID du template
   * @param {number} userId - ID de l'utilisateur (vérification de sécurité)
   * @returns {Object} Résultat de la suppression
   */
  delete: db.prepare(`
    DELETE FROM content_templates WHERE id = ? AND user_id = ?
  `)
};

module.exports = Template;

