const crypto = require('crypto');
const { siteQueries } = require('../database');

/**
 * Génère un hash unique aléatoire pour un site
 * @param {number} length - Longueur du hash (défaut: 10)
 * @returns {string} Hash unique
 */
function generateUniqueHash(length = 10) {
  let hash;
  let isUnique = false;
  
  // Caractères alphanumériques (sans caractères ambigus comme 0, O, I, l)
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  while (!isUnique) {
    // Générer un hash aléatoire
    const randomBytes = crypto.randomBytes(length);
    hash = '';
    
    for (let i = 0; i < length; i++) {
      hash += chars[randomBytes[i] % chars.length];
    }
    
    // Vérifier l'unicité dans la base de données
    const existing = siteQueries.findByHash.get(hash);
    if (!existing) {
      isUnique = true;
    }
  }
  
  return hash;
}

module.exports = {
  generateUniqueHash
};

