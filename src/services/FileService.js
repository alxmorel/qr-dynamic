/**
 * Service pour la gestion des fichiers uploadés
 * Gère l'upload, la suppression et la normalisation des chemins de fichiers
 */

const fs = require('fs');
const path = require('path');
const { normalizePath } = require('../../utils/pathUtils');

class FileService {
  /**
   * Supprimer un fichier s'il existe
   * @param {string} filePath - Chemin relatif ou absolu du fichier
   */
  static deleteFile(filePath) {
    if (!filePath) return;
    
    // Convertir le chemin relatif en chemin absolu si nécessaire
    const absolutePath = filePath.startsWith('/uploads/')
      ? path.join('.', filePath)
      : filePath;
    
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (error) {
        console.error(`Erreur lors de la suppression du fichier ${absolutePath}:`, error);
      }
    }
  }

  /**
   * Gérer l'upload d'une image de contenu
   * @param {Object} file - Fichier uploadé (multer)
   * @param {number} userId - ID de l'utilisateur
   * @param {string} siteHash - Hash du site
   * @param {string|null} existingImagePath - Chemin de l'image existante (à supprimer si différente)
   * @returns {string|null} Chemin relatif de la nouvelle image ou null
   */
  static handleContentImageUpload(file, userId, siteHash, existingImagePath = null) {
    if (!file) {
      return existingImagePath;
    }

    const relativePath = `/uploads/${String(userId)}/${siteHash}/${file.filename}`;
    
    // Supprimer l'ancienne image si elle existe et est différente
    if (existingImagePath && existingImagePath !== relativePath && existingImagePath.startsWith("/uploads/")) {
      this.deleteFile(existingImagePath);
    }

    return relativePath;
  }

  /**
   * Gérer l'upload d'un PDF de contenu
   * @param {Object} file - Fichier uploadé (multer)
   * @param {number} userId - ID de l'utilisateur
   * @param {string} siteHash - Hash du site
   * @param {string|null} existingPdfPath - Chemin du PDF existant (à supprimer si différent)
   * @returns {string|null} Chemin relatif du nouveau PDF ou null
   */
  static handleContentPdfUpload(file, userId, siteHash, existingPdfPath = null) {
    if (!file) {
      return existingPdfPath;
    }

    const relativePath = `/uploads/${String(userId)}/${siteHash}/${file.filename}`;
    
    // Supprimer l'ancien PDF si il existe et est différent
    if (existingPdfPath && existingPdfPath !== relativePath && existingPdfPath.startsWith("/uploads/")) {
      this.deleteFile(existingPdfPath);
    }

    return relativePath;
  }

  /**
   * Gérer l'upload d'un favicon
   * @param {Object} file - Fichier uploadé (multer)
   * @param {number} userId - ID de l'utilisateur
   * @param {string} siteHash - Hash du site
   * @param {string|null} existingFaviconPath - Chemin du favicon existant (à supprimer si différent)
   * @returns {string|null} Chemin relatif du nouveau favicon ou null
   */
  static handleFaviconUpload(file, userId, siteHash, existingFaviconPath = null) {
    if (!file) {
      return existingFaviconPath;
    }

    const relativePath = `/uploads/${String(userId)}/${siteHash}/${file.filename}`;
    
    // Supprimer l'ancien favicon si il existe et est différent
    if (existingFaviconPath && existingFaviconPath !== relativePath && existingFaviconPath.startsWith("/uploads/")) {
      this.deleteFile(existingFaviconPath);
    }

    return relativePath;
  }

  /**
   * Gérer l'upload d'une image de fond
   * @param {Object} file - Fichier uploadé (multer)
   * @param {number} userId - ID de l'utilisateur
   * @param {string} siteHash - Hash du site
   * @param {string|null} existingBackgroundPath - Chemin de l'image existante (à supprimer si différente)
   * @returns {string|null} Chemin relatif de la nouvelle image ou null
   */
  static handleBackgroundImageUpload(file, userId, siteHash, existingBackgroundPath = null) {
    if (!file) {
      return existingBackgroundPath;
    }

    const relativePath = `/uploads/${String(userId)}/${siteHash}/${file.filename}`;
    
    // Supprimer l'ancienne image si elle existe et est différente
    if (existingBackgroundPath && existingBackgroundPath !== relativePath && existingBackgroundPath.startsWith("/uploads/")) {
      this.deleteFile(existingBackgroundPath);
    }

    return relativePath;
  }

  /**
   * Supprimer un favicon
   * @param {string} faviconPath - Chemin du favicon à supprimer
   */
  static removeFavicon(faviconPath) {
    if (faviconPath && faviconPath.startsWith("/uploads/")) {
      this.deleteFile(faviconPath);
    }
  }

  /**
   * Supprimer une image de fond
   * @param {string} backgroundPath - Chemin de l'image de fond à supprimer
   */
  static removeBackgroundImage(backgroundPath) {
    if (backgroundPath && backgroundPath.startsWith("/uploads/")) {
      this.deleteFile(backgroundPath);
    }
  }

  /**
   * Normaliser les chemins dans un objet de contenu
   * @param {Object} content - Objet contenu avec des chemins potentiels
   * @returns {Object} Contenu avec chemins normalisés
   */
  static normalizeContentPaths(content) {
    if (!content) return content;

    const normalized = { ...content };

    if (normalized.backgroundImage) {
      normalized.backgroundImage = normalizePath(normalized.backgroundImage);
    }
    if (normalized.favicon) {
      normalized.favicon = normalizePath(normalized.favicon);
    }
    if (normalized.value) {
      normalized.value = normalizePath(normalized.value);
    }

    return normalized;
  }
}

module.exports = FileService;

