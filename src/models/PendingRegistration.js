/**
 * Modèle PendingRegistration - Gestion des inscriptions en attente de vérification email
 */

const db = require('./database');

/**
 * Requêtes préparées pour les inscriptions en attente
 */
const PendingRegistration = {
  /**
   * Créer une nouvelle inscription en attente
   * @param {string} username - Nom d'utilisateur
   * @param {string} email - Email
   * @param {string} passwordHash - Hash du mot de passe
   * @param {string|null} inviteToken - Token d'invitation (optionnel)
   * @param {string} verificationToken - Token de vérification
   * @param {string} expiresAt - Date d'expiration (ISO string)
   * @returns {Object} Résultat de l'insertion avec lastInsertRowid
   */
  create: db.prepare(`
    INSERT INTO pending_registrations (
      username,
      email,
      password_hash,
      invite_token,
      verification_token,
      expires_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `),

  /**
   * Trouver une inscription en attente par token de vérification
   * @param {string} token - Token de vérification
   * @returns {Object|null} Inscription en attente ou null
   */
  findByToken: db.prepare(`
    SELECT * FROM pending_registrations WHERE verification_token = ?
  `),

  /**
   * Trouver une inscription en attente par email
   * @param {string} email - Email
   * @returns {Object|null} Inscription en attente ou null
   */
  findByEmail: db.prepare(`
    SELECT * FROM pending_registrations WHERE email = ?
  `),

  /**
   * Trouver une inscription en attente par nom d'utilisateur
   * @param {string} username - Nom d'utilisateur
   * @returns {Object|null} Inscription en attente ou null
   */
  findByUsername: db.prepare(`
    SELECT * FROM pending_registrations WHERE username = ?
  `),

  /**
   * Supprimer une inscription en attente par ID
   * @param {number} id - ID de l'inscription
   * @returns {Object} Résultat de la suppression
   */
  deleteById: db.prepare(`
    DELETE FROM pending_registrations WHERE id = ?
  `),

  /**
   * Supprimer toutes les inscriptions expirées
   * @returns {Object} Résultat de la suppression
   */
  deleteExpired: db.prepare(`
    DELETE FROM pending_registrations WHERE expires_at < datetime('now')
  `)
};

module.exports = PendingRegistration;

