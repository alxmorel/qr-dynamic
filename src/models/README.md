# Modèles de Base de Données

Ce dossier contient tous les modèles de données de l'application, organisés de manière modulaire pour améliorer la maintenabilité.

## Structure

```
src/models/
├── database.js              # Connexion à la base de données SQLite
├── User.js                  # Modèle utilisateur
├── Site.js                  # Modèle site
├── Content.js               # Modèle contenu (avec chiffrement automatique)
├── Invitation.js            # Modèle invitation
├── SiteAdmin.js             # Modèle administrateur de site
├── PendingRegistration.js   # Modèle inscription en attente
├── Template.js              # Modèle template de contenu
├── index.js                 # Point d'entrée (exécute les migrations)
└── migrations/              # Système de migrations
    ├── migrationRunner.js
    ├── migration_001_initial_schema.js
    ├── migration_002_add_hash_to_users.js
    ├── migration_003_add_google_id_to_users.js
    ├── migration_004_add_public_password_to_sites.js
    └── migration_005_add_qr_code_config_to_sites.js
```

## Utilisation

### Import des modèles

```javascript
const { User, Site, Content } = require('./src/models');

// Utilisation
const user = User.findById.get(1);
const site = Site.findByHash.get('abc123');
const content = Content.findBySiteId.get(site.id);
```

### Exports de compatibilité

Pour faciliter la transition, les anciens noms sont toujours disponibles :
- `userQueries` → `User`
- `siteQueries` → `Site`
- `contentQueries` → `Content`
- `invitationQueries` → `Invitation`
- `siteAdminQueries` → `SiteAdmin`
- `pendingRegistrationQueries` → `PendingRegistration`
- `templateQueries` → `Template`

## Migrations

Les migrations sont automatiquement exécutées au démarrage de l'application via `src/models/index.js`.

### Créer une nouvelle migration

1. Créer un fichier `migration_XXX_description.js` dans `src/models/migrations/`
2. Suivre le format :

```javascript
module.exports = {
  up: (db) => {
    // Code de migration
    db.exec(`ALTER TABLE users ADD COLUMN new_column TEXT;`);
  }
};
```

3. Les migrations sont exécutées dans l'ordre alphabétique

### Exécuter les migrations manuellement

```javascript
const { runAllMigrations } = require('./src/models/migrations/migrationRunner');
runAllMigrations();
```

## Modèles disponibles

### User
- `create(hash, username, email, passwordHash, googleId)`
- `findByEmail(email)`
- `findByUsername(username)`
- `findByGoogleId(googleId)`
- `findById(id)`
- `findByHash(hash)`
- `updateHash(hash, id)`
- `updateGoogleId(googleId, id)`

### Site
- `create(hash, userId)`
- `findByHash(hash)`
- `findById(id)`
- `findByUserId(userId)`
- `findByHashAndUserId(hash, userId)`
- `updateTimestamp(id)`
- `updatePublicPassword(enabled, passwordHash, passwordPlain, id)`
- `updateQrCodeConfig(config, id)`
- `delete(id, userId)`

### Content
- `create(siteId, type, value, title, backgroundColor, backgroundImage, cardBackgroundColor, favicon)`
- `findBySiteIdRaw(siteId)` - Retourne le contenu brut (non déchiffré)
- `findBySiteId.get(siteId)` - Retourne le contenu déchiffré automatiquement
- `update(...)`
- `upsert(siteId, content)` - Crée ou met à jour avec chiffrement automatique

### Invitation
- `create(siteId, createdBy, token, expiresAt)`
- `findByToken(token)`
- `findBySiteId(siteId)`
- `findActiveBySiteId(siteId)`
- `markAsUsed(userId, token)`
- `delete(id, createdBy)`

### SiteAdmin
- `create(siteId, userId)`
- `findBySiteId(siteId)`
- `findBySiteIdAndUserId(siteId, userId)`
- `isAdmin(siteId, userId)`
- `remove(siteId, userId)`
- `findSitesByUserId(userId)` - Trouve tous les sites où l'utilisateur est admin

### PendingRegistration
- `create(username, email, passwordHash, inviteToken, verificationToken, expiresAt)`
- `findByToken(token)`
- `findByEmail(email)`
- `findByUsername(username)`
- `deleteById(id)`
- `deleteExpired()`

### Template
- `create(userId, name, type, value, title, backgroundColor, backgroundImage, cardBackgroundColor, favicon, isDefault)`
- `findByUserId(userId)`
- `findById(id, userId)`
- `findDefaultTemplates()`
- `update(...)`
- `delete(id, userId)`

**Note:** Les templates nécessitent un chiffrement manuel des champs sensibles avant l'appel aux méthodes `create` et `update`.

## Chiffrement

Le modèle `Content` gère automatiquement le chiffrement/déchiffrement des champs sensibles :
- `value`
- `title`
- `backgroundImage`
- `favicon`

Les autres modèles nécessitent un chiffrement manuel si nécessaire.

## Notes importantes

- Toutes les requêtes sont préparées pour des raisons de performance et de sécurité
- Les migrations sont idempotentes (peuvent être exécutées plusieurs fois sans erreur)
- La table `migrations` suit quelles migrations ont été appliquées
- Les migrations sont exécutées dans une transaction pour garantir la cohérence

