/**
 * Service pour la gestion des templates de contenu
 * Gère la création, récupération, mise à jour et suppression des templates
 */

const { Template } = require('../models');
const { encrypt, decrypt } = require('../../utils/encryption');

class TemplateService {
  /**
   * Récupérer tous les templates d'un utilisateur (avec templates par défaut)
   * @param {number} userId - ID de l'utilisateur
   * @returns {Array} Liste des templates déchiffrés
   */
  static getUserTemplates(userId) {
    const userTemplates = Template.findByUserId.all(userId);
    const defaultTemplates = Template.findDefaultTemplates.all();
    
    // Combiner et formater les templates avec déchiffrement
    return [...defaultTemplates, ...userTemplates].map(template => ({
      id: template.id,
      name: template.name,
      type: template.type,
      title: template.title ? decrypt(template.title) : null,
      value: template.value ? decrypt(template.value) : null,
      backgroundColor: template.backgroundColor,
      cardBackgroundColor: template.cardBackgroundColor,
      is_default: template.is_default === 1,
      created_at: template.created_at
    }));
  }

  /**
   * Récupérer un template spécifique par ID
   * @param {number} templateId - ID du template
   * @param {number} userId - ID de l'utilisateur (pour vérification)
   * @returns {Object|null} Template déchiffré ou null
   */
  static getTemplateById(templateId, userId) {
    const template = Template.findById.get(templateId, userId);
    
    if (template) {
      // Template utilisateur trouvé
      return {
        id: template.id,
        name: template.name,
        type: template.type,
        title: template.title ? decrypt(template.title) : null,
        value: template.value ? decrypt(template.value) : null,
        backgroundColor: template.backgroundColor,
        cardBackgroundColor: template.cardBackgroundColor,
        backgroundImage: template.backgroundImage ? decrypt(template.backgroundImage) : null,
        favicon: template.favicon ? decrypt(template.favicon) : null,
        is_default: template.is_default === 1
      };
    }

    // Vérifier si c'est un template par défaut
    const defaultTemplates = Template.findDefaultTemplates.all();
    const defaultTemplate = defaultTemplates.find(t => t.id === templateId);
    
    if (defaultTemplate) {
      return {
        id: defaultTemplate.id,
        name: defaultTemplate.name,
        type: defaultTemplate.type,
        title: defaultTemplate.title ? decrypt(defaultTemplate.title) : null,
        value: defaultTemplate.value ? decrypt(defaultTemplate.value) : null,
        backgroundColor: defaultTemplate.backgroundColor,
        cardBackgroundColor: defaultTemplate.cardBackgroundColor,
        backgroundImage: defaultTemplate.backgroundImage ? decrypt(defaultTemplate.backgroundImage) : null,
        favicon: defaultTemplate.favicon ? decrypt(defaultTemplate.favicon) : null,
        is_default: true
      };
    }

    return null;
  }

  /**
   * Créer un nouveau template
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} templateData - Données du template
   * @returns {Object} { id, message }
   */
  static createTemplate(userId, templateData) {
    const { name, type, value, title, backgroundColor, cardBackgroundColor, backgroundImage, favicon } = templateData;
    
    if (!name || !name.trim()) {
      throw new Error("Le nom du template est requis");
    }

    // Chiffrer les champs sensibles
    const encryptedValue = value ? encrypt(value) : null;
    const encryptedTitle = title ? encrypt(title) : null;
    const encryptedBackgroundImage = backgroundImage ? encrypt(backgroundImage) : null;
    const encryptedFavicon = favicon ? encrypt(favicon) : null;

    // Créer le template
    const result = Template.create.run(
      userId,
      name.trim(),
      type || 'text',
      encryptedValue,
      encryptedTitle,
      backgroundColor || null,
      encryptedBackgroundImage,
      cardBackgroundColor || null,
      encryptedFavicon,
      0 // is_default = 0 pour les templates utilisateur
    );

    return {
      id: result.lastInsertRowid,
      message: "Template créé avec succès"
    };
  }

  /**
   * Supprimer un template
   * @param {number} templateId - ID du template
   * @param {number} userId - ID de l'utilisateur (vérification de sécurité)
   */
  static deleteTemplate(templateId, userId) {
    // Vérifier que le template existe et appartient à l'utilisateur
    const template = Template.findById.get(templateId, userId);
    
    if (!template) {
      throw new Error("Template non trouvé");
    }

    // Ne pas permettre la suppression des templates par défaut
    if (template.is_default === 1) {
      throw new Error("Impossible de supprimer un template par défaut");
    }

    // Supprimer le template
    Template.delete.run(templateId, userId);
  }

  /**
   * Valider un ID de template
   * @param {string} templateIdParam - Paramètre templateId depuis la requête
   * @returns {number} ID de template validé
   * @throws {Error} Si l'ID est invalide
   */
  static validateTemplateId(templateIdParam) {
    const templateId = parseInt(templateIdParam, 10);
    
    if (isNaN(templateId) || templateIdParam === '' || templateIdParam === null || templateIdParam === undefined) {
      throw new Error(`ID de template invalide: ${templateIdParam}`);
    }

    return templateId;
  }
}

module.exports = TemplateService;

