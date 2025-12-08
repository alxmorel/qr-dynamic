/**
 * Configuration centralisée pour l'authentification Google OAuth
 */

require("dotenv").config();

/**
 * Vérifie si l'authentification Google est configurée
 * @returns {boolean} True si GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont définis
 */
function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Récupère l'URL de base de l'application
 * @returns {string} L'URL de base sans slash final
 */
function getAppBaseUrl() {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Récupère l'URL de callback Google OAuth
 * @returns {string} L'URL de callback complète
 */
function getGoogleCallbackUrl() {
  const appBaseUrl = getAppBaseUrl();
  return process.env.GOOGLE_CALLBACK_URL || `${appBaseUrl}/auth/google/callback`;
}

/**
 * Récupère la configuration Google OAuth
 * @returns {Object|null} Configuration Google ou null si non configurée
 */
function getGoogleAuthConfig() {
  if (!isGoogleAuthConfigured()) {
    return null;
  }
  
  return {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: getGoogleCallbackUrl()
  };
}

module.exports = {
  isGoogleAuthConfigured,
  getAppBaseUrl,
  getGoogleCallbackUrl,
  getGoogleAuthConfig
};

