/**
 * Service pour la gestion des sites
 * Contient toute la logique métier liée aux sites
 */

const { Site, User, Content, SiteAdmin } = require('../models');
const { generateUniqueHash } = require('../../utils/hash');
const { hashPassword } = require('../../utils/auth');
const fs = require('fs');
const path = require('path');

class SiteService {
  /**
   * Créer un nouveau site pour un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object} { siteHash, siteId }
   */
  static createSite(userId) {
    const siteHash = generateUniqueHash();
    const siteResult = Site.create.run(siteHash, userId);
    const siteId = siteResult.lastInsertRowid;
    
    return {
      siteHash,
      siteId
    };
  }

  /**
   * Supprimer un site et ses fichiers associés
   * @param {number} siteId - ID du site
   * @param {number} userId - ID du propriétaire (vérification de sécurité)
   * @param {string} siteHash - Hash du site (pour supprimer les fichiers)
   */
  static deleteSite(siteId, userId, siteHash) {
    // Supprimer le site (et son contenu via CASCADE)
    Site.delete.run(siteId, userId);
    
    // Supprimer les fichiers uploadés associés au site
    const uploadDir = path.join("./uploads", String(userId), siteHash);
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
  }

  /**
   * Mettre à jour le mot de passe public d'un site
   * @param {number} siteId - ID du site
   * @param {boolean} enabled - Si le mot de passe est activé
   * @param {string|null} password - Nouveau mot de passe (optionnel)
   * @returns {Promise<Object>} { passwordHash, passwordPlain }
   */
  static async updatePublicPassword(siteId, enabled, password = null) {
    let passwordHash = null;
    let passwordPlain = null;

    if (enabled) {
      if (password && password.trim() !== "") {
        // Hasher le nouveau mot de passe
        passwordHash = await hashPassword(password);
        passwordPlain = password;
      }
      // Si pas de nouveau mot de passe mais que la protection est activée,
      // on garde l'ancien (géré par la route)
    } else {
      // Désactiver la protection
      passwordHash = null;
      passwordPlain = null;
    }

    Site.updatePublicPassword.run(
      enabled ? 1 : 0,
      passwordHash,
      passwordPlain,
      siteId
    );

    return { passwordHash, passwordPlain };
  }

  /**
   * Mettre à jour la configuration QR code d'un site
   * @param {number} siteId - ID du site
   * @param {Object} config - Configuration QR code
   */
  static updateQrCodeConfig(siteId, config) {
    const configJson = JSON.stringify(config);
    Site.updateQrCodeConfig.run(configJson, siteId);
  }

  /**
   * Récupérer la configuration QR code d'un site
   * @param {Object} site - Objet site avec qr_code_config
   * @returns {Object|null} Configuration QR code parsée ou null
   */
  static getQrCodeConfig(site) {
    if (!site.qr_code_config) {
      return null;
    }

    try {
      return JSON.parse(site.qr_code_config);
    } catch (e) {
      console.error('Erreur lors du parsing de la configuration QR code:', e);
      return null;
    }
  }

  /**
   * Construire l'URL publique d'un site
   * @param {Object} req - Objet request Express
   * @param {string} siteHash - Hash du site
   * @returns {string} URL publique complète
   */
  static buildPublicUrl(req, siteHash) {
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    return `${protocol}://${host}/${siteHash}`;
  }

  /**
   * Récupérer tous les sites d'un utilisateur avec leurs titres
   * @param {number} userId - ID de l'utilisateur
   * @returns {Array} Liste des sites enrichis avec titre et isOwner
   */
  static getUserSitesWithTitles(userId) {
    // Récupérer tous les sites où l'utilisateur est administrateur
    const sites = SiteAdmin.findSitesByUserId.all(userId, userId);
    
    // Enrichir chaque site avec son titre et indiquer s'il est propriétaire
    return sites.map(site => {
      const content = Content.findBySiteId.get(site.id);
      const isOwner = site.user_id === userId;
      return {
        ...site,
        title: content ? content.title : null,
        isOwner: isOwner
      };
    });
  }
}

module.exports = SiteService;

