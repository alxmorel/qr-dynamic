/**
 * Utilitaires pour la normalisation des chemins
 */

/**
 * Normalise les chemins d'URL (remplace les backslashes par des slashes)
 * Utile pour les chemins Windows qui utilisent des backslashes dans les URLs
 * 
 * @param {string|null|undefined} pathStr - Le chemin à normaliser
 * @returns {string|null|undefined} Le chemin normalisé ou la valeur originale si non applicable
 */
function normalizePath(pathStr) {
  if (pathStr && pathStr.startsWith("/uploads/")) {
    return pathStr.replace(/\\/g, '/');
  }
  return pathStr;
}

module.exports = {
  normalizePath
};

