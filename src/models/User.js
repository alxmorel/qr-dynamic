/**
 * Modèle User - Gestion des utilisateurs
 */

const db = require('./database');

/**
 * Requêtes préparées pour les utilisateurs
 */
const User = {
  /**
   * Créer un nouvel utilisateur
   * @param {string} hash - Hash unique de l'utilisateur
   * @param {string} username - Nom d'utilisateur
   * @param {string} email - Email
   * @param {string} passwordHash - Hash du mot de passe
   * @param {string|null} googleId - ID Google (optionnel)
   * @returns {Object} Résultat de l'insertion avec lastInsertRowid
   */
  create: db.prepare(`
    INSERT INTO users (hash, username, email, password_hash, google_id)
    VALUES (?, ?, ?, ?, ?)
  `),
  
  /**
   * Trouver un utilisateur par email
   * @param {string} email - Email de l'utilisateur
   * @returns {Object|null} Utilisateur ou null
   */
  findByEmail: db.prepare(`
    SELECT * FROM users WHERE email = ?
  `),
  
  /**
   * Trouver un utilisateur par nom d'utilisateur
   * @param {string} username - Nom d'utilisateur
   * @returns {Object|null} Utilisateur ou null
   */
  findByUsername: db.prepare(`
    SELECT * FROM users WHERE username = ?
  `),
  
  /**
   * Trouver un utilisateur par ID Google
   * @param {string} googleId - ID Google
   * @returns {Object|null} Utilisateur ou null
   */
  findByGoogleId: db.prepare(`
    SELECT * FROM users WHERE google_id = ?
  `),

  /**
   * Trouver un utilisateur par ID
   * @param {number} id - ID de l'utilisateur
   * @returns {Object|null} Utilisateur ou null
   */
  findById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),
  
  /**
   * Trouver un utilisateur par hash
   * @param {string} hash - Hash de l'utilisateur
   * @returns {Object|null} Utilisateur ou null
   */
  findByHash: db.prepare(`
    SELECT * FROM users WHERE hash = ?
  `),
  
  /**
   * Mettre à jour le hash d'un utilisateur
   * @param {string} hash - Nouveau hash
   * @param {number} id - ID de l'utilisateur
   * @returns {Object} Résultat de la mise à jour
   */
  updateHash: db.prepare(`
    UPDATE users SET hash = ? WHERE id = ?
  `),

  /**
   * Mettre à jour l'ID Google d'un utilisateur
   * @param {string} googleId - ID Google
   * @param {number} id - ID de l'utilisateur
   * @returns {Object} Résultat de la mise à jour
   */
  updateGoogleId: db.prepare(`
    UPDATE users SET google_id = ? WHERE id = ?
  `)
};

module.exports = User;

