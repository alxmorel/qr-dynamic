/**
 * Service pour la gestion du contenu des sites
 * Gère la création, mise à jour et normalisation du contenu
 */

const { Content } = require('../models');
const FileService = require('./FileService');

class ContentService {
  /**
   * Récupérer le contenu d'un site avec valeurs par défaut
   * @param {number} siteId - ID du site
   * @returns {Object} Contenu avec valeurs par défaut si nécessaire
   */
  static getSiteContent(siteId) {
    const content = Content.findBySiteId.get(siteId);
    
    // Valeurs par défaut
    const defaultContent = {
      type: "text",
      value: "",
      title: "Mon site",
      backgroundColor: "#faf6ff",
      backgroundImage: null,
      cardBackgroundColor: "#ffffff",
      favicon: null
    };

    const displayContent = content || defaultContent;
    
    // Normaliser les chemins
    return FileService.normalizeContentPaths(displayContent);
  }

  /**
   * Mettre à jour le contenu d'un site avec gestion des fichiers uploadés
   * @param {number} siteId - ID du site
   * @param {Object} contentData - Données du contenu depuis le formulaire
   * @param {Object} files - Fichiers uploadés (multer)
   * @param {Object} existingContent - Contenu existant
   * @param {number} userId - ID de l'utilisateur
   * @param {string} siteHash - Hash du site
   * @returns {Object} Nouveau contenu préparé pour la sauvegarde
   */
  static prepareContentUpdate(contentData, files, existingContent, userId, siteHash) {
    const newContent = {
      type: contentData.type || existingContent?.type || "text",
      value: contentData.value || existingContent?.value || "",
      title: contentData.title || existingContent?.title || "Mon site",
      backgroundColor: contentData.backgroundColor || existingContent?.backgroundColor || "#faf6ff",
      backgroundImage: existingContent?.backgroundImage || null,
      cardBackgroundColor: contentData.cardBackgroundColorValue || contentData.cardBackgroundColor || existingContent?.cardBackgroundColor || "#ffffff",
      favicon: existingContent?.favicon || null
    };

    // Gérer l'image de contenu si type = image
    if (newContent.type === "image") {
      const existingUploadedContentImage = existingContent?.type === "image" && existingContent.value && existingContent.value.startsWith("/uploads/")
        ? existingContent.value
        : null;

      if (files?.contentImageFile?.[0]) {
        newContent.value = FileService.handleContentImageUpload(
          files.contentImageFile[0],
          userId,
          siteHash,
          existingUploadedContentImage
        );
      } else if (existingUploadedContentImage) {
        newContent.value = existingUploadedContentImage;
      } else {
        newContent.value = existingContent?.value || "";
      }
    }

    // Gérer le PDF de contenu si type = pdf
    if (newContent.type === "pdf") {
      const existingUploadedContentPdf = existingContent?.type === "pdf" && existingContent.value && existingContent.value.startsWith("/uploads/")
        ? existingContent.value
        : null;

      if (files?.contentPdfFile?.[0]) {
        newContent.value = FileService.handleContentPdfUpload(
          files.contentPdfFile[0],
          userId,
          siteHash,
          existingUploadedContentPdf
        );
      } else if (existingUploadedContentPdf) {
        newContent.value = existingUploadedContentPdf;
      } else {
        newContent.value = existingContent?.value || "";
      }
    }

    // Gérer l'upload du favicon
    if (files?.faviconFile?.[0]) {
      newContent.favicon = FileService.handleFaviconUpload(
        files.faviconFile[0],
        userId,
        siteHash,
        existingContent?.favicon
      );
    } else if (contentData.removeFavicon === "true") {
      FileService.removeFavicon(existingContent?.favicon);
      newContent.favicon = null;
    } else if (existingContent?.favicon) {
      newContent.favicon = existingContent.favicon;
    }

    // Gérer l'upload de l'image de fond
    if (files?.backgroundImageFile?.[0]) {
      newContent.backgroundImage = FileService.handleBackgroundImageUpload(
        files.backgroundImageFile[0],
        userId,
        siteHash,
        existingContent?.backgroundImage
      );
    } else if (contentData.removeBackgroundImage === "true") {
      FileService.removeBackgroundImage(existingContent?.backgroundImage);
      newContent.backgroundImage = null;
    } else if (existingContent?.backgroundImage) {
      newContent.backgroundImage = existingContent.backgroundImage;
    }

    return newContent;
  }

  /**
   * Sauvegarder le contenu d'un site
   * @param {number} siteId - ID du site
   * @param {Object} content - Contenu à sauvegarder
   */
  static saveContent(siteId, content) {
    Content.upsert(siteId, content);
  }
}

module.exports = ContentService;

