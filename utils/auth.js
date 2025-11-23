const bcrypt = require('bcrypt');
const { userQueries, siteQueries } = require('../database');
const { generateUniqueHash } = require('./hash');

/**
 * Hash un mot de passe avec bcrypt
 * @param {string} password - Mot de passe en clair
 * @returns {string} Hash du mot de passe
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Vérifie un mot de passe contre un hash
 * @param {string} password - Mot de passe en clair
 * @param {string} hash - Hash du mot de passe
 * @returns {boolean} True si le mot de passe correspond
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Crée un nouvel utilisateur avec un site par défaut
 * @param {string} username - Nom d'utilisateur
 * @param {string} email - Email
 * @param {string} password - Mot de passe en clair
 * @returns {Object} { user, site } - Utilisateur et site créés
 */
async function createUserWithSite(username, email, password) {
  // Vérifier si l'email ou le username existe déjà
  const existingEmail = userQueries.findByEmail.get(email);
  if (existingEmail) {
    throw new Error('Cet email est déjà utilisé');
  }
  
  const existingUsername = userQueries.findByUsername.get(username);
  if (existingUsername) {
    throw new Error('Ce nom d\'utilisateur est déjà utilisé');
  }
  
  // Hasher le mot de passe
  const passwordHash = await hashPassword(password);
  
  // Créer l'utilisateur
  const userResult = userQueries.create.run(username, email, passwordHash);
  const userId = userResult.lastInsertRowid;
  
  // Générer un hash unique pour le site
  const siteHash = generateUniqueHash();
  
  // Créer le site par défaut
  const siteResult = siteQueries.create.run(siteHash, userId);
  const siteId = siteResult.lastInsertRowid;
  
  // Récupérer l'utilisateur et le site créés
  const user = userQueries.findById.get(userId);
  const site = siteQueries.findByHash.get(siteHash);
  
  return { user, site };
}

/**
 * Authentifie un utilisateur
 * @param {string} identifier - Email ou username
 * @param {string} password - Mot de passe en clair
 * @returns {Object|null} Utilisateur si authentifié, null sinon
 */
async function authenticateUser(identifier, password) {
  // Essayer de trouver par email d'abord
  let user = userQueries.findByEmail.get(identifier);
  
  // Si pas trouvé, essayer par username
  if (!user) {
    user = userQueries.findByUsername.get(identifier);
  }
  
  if (!user) {
    return null;
  }
  
  // Vérifier le mot de passe
  const isValid = await verifyPassword(password, user.password_hash);
  
  if (!isValid) {
    return null;
  }
  
  // Retourner l'utilisateur (sans le hash du mot de passe)
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createUserWithSite,
  authenticateUser
};

