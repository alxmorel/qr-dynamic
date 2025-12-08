# Services - Logique Métier

Ce dossier contient tous les services qui encapsulent la logique métier de l'application. Les routes doivent être minces et déléguer toute la logique métier aux services.

## Structure

```
src/services/
├── SiteService.js          # Gestion des sites
├── ContentService.js        # Gestion du contenu
├── FileService.js           # Gestion des fichiers uploadés
├── TemplateService.js       # Gestion des templates
├── InvitationService.js     # Gestion des invitations
└── README.md               # Cette documentation
```

## Principes

1. **Séparation des responsabilités** : Les routes gèrent HTTP, les services gèrent la logique métier
2. **Réutilisabilité** : Les services peuvent être utilisés depuis n'importe où (routes, autres services, scripts)
3. **Testabilité** : La logique métier isolée est facile à tester
4. **Maintenabilité** : Code organisé et facile à comprendre

## Services disponibles

### SiteService

Gestion des sites : création, suppression, configuration.

**Méthodes principales :**
- `createSite(userId)` - Créer un nouveau site
- `deleteSite(siteId, userId, siteHash)` - Supprimer un site et ses fichiers
- `updatePublicPassword(siteId, enabled, password)` - Mettre à jour le mot de passe public
- `updateQrCodeConfig(siteId, config)` - Mettre à jour la configuration QR code
- `getQrCodeConfig(site)` - Récupérer la configuration QR code
- `buildPublicUrl(req, siteHash)` - Construire l'URL publique d'un site
- `getUserSitesWithTitles(userId)` - Récupérer tous les sites d'un utilisateur avec titres

### ContentService

Gestion du contenu des sites : récupération, préparation et sauvegarde.

**Méthodes principales :**
- `getSiteContent(siteId)` - Récupérer le contenu avec valeurs par défaut et normalisation
- `prepareContentUpdate(contentData, files, existingContent, userId, siteHash)` - Préparer la mise à jour avec gestion des fichiers
- `saveContent(siteId, content)` - Sauvegarder le contenu

### FileService

Gestion des fichiers uploadés : upload, suppression, normalisation des chemins.

**Méthodes principales :**
- `deleteFile(filePath)` - Supprimer un fichier
- `handleContentImageUpload(file, userId, siteHash, existingImagePath)` - Gérer l'upload d'image de contenu
- `handleFaviconUpload(file, userId, siteHash, existingFaviconPath)` - Gérer l'upload de favicon
- `handleBackgroundImageUpload(file, userId, siteHash, existingBackgroundPath)` - Gérer l'upload d'image de fond
- `removeFavicon(faviconPath)` - Supprimer un favicon
- `removeBackgroundImage(backgroundPath)` - Supprimer une image de fond
- `normalizeContentPaths(content)` - Normaliser les chemins dans un objet contenu

### TemplateService

Gestion des templates de contenu avec chiffrement automatique.

**Méthodes principales :**
- `getUserTemplates(userId)` - Récupérer tous les templates (utilisateur + par défaut)
- `getTemplateById(templateId, userId)` - Récupérer un template spécifique
- `createTemplate(userId, templateData)` - Créer un nouveau template
- `deleteTemplate(templateId, userId)` - Supprimer un template
- `validateTemplateId(templateIdParam)` - Valider un ID de template

### InvitationService

Gestion des invitations de sites : création, validation, acceptation.

**Méthodes principales :**
- `createInvitation(siteId, createdBy, daysUntilExpiry)` - Créer une invitation
- `buildInvitationUrl(req, token)` - Construire l'URL d'une invitation
- `validateInvitation(token)` - Valider une invitation (vérifie expiration, utilisation, etc.)
- `acceptInvitation(token, userId)` - Accepter une invitation
- `getActiveInvitations(siteId)` - Récupérer les invitations actives
- `deleteInvitation(invitationId, siteId, createdBy)` - Supprimer une invitation
- `getSiteAdmins(siteId)` - Récupérer tous les administrateurs d'un site
- `removeAdmin(siteId, adminId)` - Retirer un administrateur

## Utilisation dans les routes

### Avant (logique métier dans la route)

```javascript
router.post("/:hashUser/sites/:hashSite", ..., async (req, res) => {
  const site = req.site;
  const existingContent = Content.findBySiteId.get(site.id);
  
  // Beaucoup de logique métier ici...
  const newContent = { /* ... */ };
  // Gestion des fichiers...
  // Chiffrement...
  // Validation...
  
  Content.upsert(site.id, newContent);
  res.redirect(...);
});
```

### Après (logique métier dans le service)

```javascript
router.post("/:hashUser/sites/:hashSite", ..., async (req, res) => {
  try {
    const site = req.site;
    const { Content } = require('../src/models');
    const existingContent = Content.findBySiteId.get(site.id);
    
    // Déléguer toute la logique au service
    const newContent = ContentService.prepareContentUpdate(
      req.body,
      req.files,
      existingContent,
      site.user_id,
      site.hash
    );
    
    ContentService.saveContent(site.id, newContent);
    res.redirect(...);
  } catch (error) {
    next(error); // Géré par errorHandler (à venir)
  }
});
```

## Gestion des erreurs

Les services lancent des erreurs avec des messages descriptifs. Les routes doivent :
1. Capturer ces erreurs
2. Retourner des réponses HTTP appropriées
3. Logger les erreurs pour le débogage

**Exemple :**
```javascript
try {
  const result = TemplateService.createTemplate(userId, req.body);
  res.json({ success: true, id: result.id });
} catch (error) {
  if (error.message.includes('nom du template')) {
    return res.status(400).json({ error: error.message });
  }
  console.error("Erreur:", error);
  res.status(500).json({ error: "Erreur serveur" });
}
```

## Tests

Les services sont conçus pour être facilement testables :

```javascript
// Exemple de test
const SiteService = require('../src/services/SiteService');

describe('SiteService', () => {
  it('should create a site', () => {
    const result = SiteService.createSite(userId);
    expect(result).toHaveProperty('siteHash');
    expect(result).toHaveProperty('siteId');
  });
});
```

## Bonnes pratiques

1. **Ne pas mélanger les responsabilités** : Un service ne doit pas gérer HTTP directement
2. **Utiliser les modèles** : Les services utilisent les modèles pour accéder aux données
3. **Gérer les erreurs** : Lancer des erreurs descriptives, pas de `console.error` dans les services
4. **Documentation** : Documenter toutes les méthodes publiques avec JSDoc
5. **Stateless** : Les services sont stateless (pas de variables d'instance)

