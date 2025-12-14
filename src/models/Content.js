/**
 * Modèle Content - Gestion du contenu des sites
 * Gère le chiffrement/déchiffrement automatique des champs sensibles
 */

const db = require('./database');
const { encrypt, decrypt } = require('../../utils/encryption');
// Chargement paresseux de Site pour éviter les erreurs si les migrations ne sont pas encore exécutées
let Site = null;
function getSite() {
  if (!Site) {
    Site = require('./Site');
  }
  return Site;
}

/**
 * Requêtes préparées pour le contenu des sites
 */
const Content = {
  /**
   * Créer un nouveau contenu
   * @param {number} siteId - ID du site
   * @param {string} type - Type de contenu
   * @param {string|null} value - Valeur (sera chiffrée)
   * @param {string|null} title - Titre (sera chiffré)
   * @param {string|null} backgroundColor - Couleur de fond
   * @param {string|null} backgroundImage - Image de fond (sera chiffrée)
   * @param {string|null} cardBackgroundColor - Couleur de fond de la carte
   * @param {string|null} favicon - Favicon (sera chiffré)
   * @returns {Object} Résultat de l'insertion avec lastInsertRowid
   */
  create: db.prepare(`
    INSERT INTO site_content (
      site_id, type, value, title, backgroundColor,
      backgroundImage, cardBackgroundColor, favicon
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  /**
   * Trouver le contenu brut d'un site (non déchiffré)
   * @param {number} siteId - ID du site
   * @returns {Object|null} Contenu brut ou null
   */
  findBySiteIdRaw: db.prepare(`
    SELECT * FROM site_content WHERE site_id = ?
    ORDER BY updated_at DESC
    LIMIT 1
  `),
  
  /**
   * Mettre à jour le contenu d'un site
   * @param {string} type - Type de contenu
   * @param {string|null} value - Valeur (sera chiffrée)
   * @param {string|null} title - Titre (sera chiffré)
   * @param {string|null} backgroundColor - Couleur de fond
   * @param {string|null} backgroundImage - Image de fond (sera chiffrée)
   * @param {string|null} cardBackgroundColor - Couleur de fond de la carte
   * @param {string|null} favicon - Favicon (sera chiffré)
   * @param {number} siteId - ID du site
   * @returns {Object} Résultat de la mise à jour
   */
  update: db.prepare(`
    UPDATE site_content SET
      type = ?,
      value = ?,
      title = ?,
      backgroundColor = ?,
      backgroundImage = ?,
      cardBackgroundColor = ?,
      favicon = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE site_id = ?
  `),
  
  /**
   * Trouver le contenu d'un site avec déchiffrement automatique
   * @param {number} siteId - ID du site
   * @returns {Object|null} Contenu déchiffré ou null
   */
  findBySiteId: {
    get: (siteId) => {
      const result = Content.findBySiteIdRaw.get(siteId);
      if (!result) {
        return null;
      }
      // Déchiffrer les champs sensibles
      return {
        ...result,
        value: result.value ? decrypt(result.value) : null,
        title: result.title ? decrypt(result.title) : null,
        backgroundImage: result.backgroundImage ? decrypt(result.backgroundImage) : null,
        favicon: result.favicon ? decrypt(result.favicon) : null
      };
    }
  },
  
  /**
   * Créer ou mettre à jour le contenu d'un site (upsert)
   * Gère automatiquement le chiffrement et la mise à jour du timestamp du site
   * @param {number} siteId - ID du site
   * @param {Object} content - Objet contenu avec les propriétés à mettre à jour
   * @returns {void}
   */
  upsert: db.transaction((siteId, content) => {
    const existing = Content.findBySiteIdRaw.get(siteId);
    
    // Préparer les valeurs en chiffrant les champs sensibles
    // Si la valeur est fournie (même null ou ""), la chiffrer
    // Sinon, utiliser la valeur existante (déjà chiffrée)
    const encryptedValue = content.hasOwnProperty('value') ? encrypt(content.value) : (existing?.value || null);
    const encryptedTitle = content.hasOwnProperty('title') ? encrypt(content.title) : (existing?.title || null);
    const encryptedBackgroundImage = content.hasOwnProperty('backgroundImage') ? encrypt(content.backgroundImage) : (existing?.backgroundImage || null);
    const encryptedFavicon = content.hasOwnProperty('favicon') ? encrypt(content.favicon) : (existing?.favicon || null);
    
    if (existing) {
      // Mettre à jour
      Content.update.run(
        content.type !== undefined ? content.type : existing.type,
        encryptedValue,
        encryptedTitle,
        content.backgroundColor !== undefined ? content.backgroundColor : existing.backgroundColor,
        encryptedBackgroundImage,
        content.cardBackgroundColor !== undefined ? content.cardBackgroundColor : existing.cardBackgroundColor,
        encryptedFavicon,
        siteId
      );
    } else {
      // Créer
      Content.create.run(
        siteId,
        content.type || 'text',
        encryptedValue,
        encryptedTitle,
        content.backgroundColor || null,
        encryptedBackgroundImage,
        content.cardBackgroundColor || null,
        encryptedFavicon
      );
    }
    
    // Mettre à jour le timestamp du site
    getSite().updateTimestamp.run(siteId);
  })
};

module.exports = Content;

