const bcrypt = require('bcrypt');
const { User, Site } = require('../src/models');
const { generateUniqueHash, generateUniqueUserHash } = require('./hash');

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
async function createUserWithSite(username, email, password, options = {}) {
  // Vérifier si l'email ou le username existe déjà
  const existingEmail = User.findByEmail.get(email);
  if (existingEmail) {
    throw new Error('Cet email est déjà utilisé');
  }
  
  const existingUsername = User.findByUsername.get(username);
  if (existingUsername) {
    throw new Error('Ce nom d\'utilisateur est déjà utilisé');
  }
  
  let passwordHash = null;
  if (options.passwordHashOverride) {
    passwordHash = options.passwordHashOverride;
  } else {
    if (!password) {
      throw new Error('Un mot de passe est requis');
    }
    passwordHash = await hashPassword(password);
  }
  
  // Générer un hash unique pour l'utilisateur
  const userHash = generateUniqueUserHash();
  const googleId = options.googleId || null;
  
  // Créer l'utilisateur
  const userResult = User.create.run(userHash, username, email, passwordHash, googleId);
  const userId = userResult.lastInsertRowid;
  
  // Générer un hash unique pour le site
  const siteHash = generateUniqueHash();
  
  // Créer le site par défaut
  const siteResult = Site.create.run(siteHash, userId);
  const siteId = siteResult.lastInsertRowid;
  
  // Récupérer l'utilisateur et le site créés
  const user = User.findById.get(userId);
  const site = Site.findByHash.get(siteHash);
  
  return { user, site };
}

/**
 * Génère un nom d'utilisateur disponible à partir d'une base
 * @param {string} base - Chaîne de base (nom, email, etc.)
 * @returns {string} Nom d'utilisateur unique
 */
function generateAvailableUsername(base) {
  const normalizedBase = (base || 'utilisateur')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'user';

  let candidate = normalizedBase;
  let suffix = 1;

  while (User.findByUsername.get(candidate)) {
    candidate = `${normalizedBase}${suffix}`;
    suffix += 1;
  }

  return candidate;
}

/**
 * Trouve ou crée un utilisateur à partir d'un profil Google
 * @param {Object} params
 * @param {string} params.googleId - Identifiant Google
 * @param {string} params.email - Email récupéré via Google
 * @param {string} params.displayName - Nom affiché Google
 * @returns {Promise<Object>} Utilisateur sans hash de mot de passe
 */
async function findOrCreateGoogleUser({ googleId, email, displayName }) {
  if (!googleId) {
    throw new Error('Identifiant Google manquant');
  }
  if (!email) {
    throw new Error('Impossible de récupérer votre email Google');
  }

  const existingGoogleUser = User.findByGoogleId.get(googleId);
  if (existingGoogleUser) {
    const { password_hash, ...userWithoutPassword } = existingGoogleUser;
    return userWithoutPassword;
  }

  const existingEmailUser = User.findByEmail.get(email);
  if (existingEmailUser) {
    if (!existingEmailUser.google_id) {
      User.updateGoogleId.run(googleId, existingEmailUser.id);
      existingEmailUser.google_id = googleId;
    }
    const { password_hash, ...userWithoutPassword } = existingEmailUser;
    return userWithoutPassword;
  }

  const username = generateAvailableUsername(displayName || email.split('@')[0]);
  const randomPassword = `google-${googleId}-${Date.now()}`;
  const { user } = await createUserWithSite(username, email, randomPassword, { googleId });
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Authentifie un utilisateur
 * @param {string} identifier - Email ou username
 * @param {string} password - Mot de passe en clair
 * @returns {Object|null} Utilisateur si authentifié, null sinon
 */
async function authenticateUser(identifier, password) {
  // Essayer de trouver par email d'abord
  let user = User.findByEmail.get(identifier);
  
  // Si pas trouvé, essayer par username
  if (!user) {
    user = User.findByUsername.get(identifier);
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
  authenticateUser,
  generateAvailableUsername,
  findOrCreateGoogleUser
};

