# Plan de Migration - QR Dynamic
## Express/SQLite → AdonisJS/PostgreSQL + Nuxt 3/Vue 3/TailwindCSS

---

## 📋 Vue d'ensemble du projet actuel

### Stack actuelle
- **Backend**: Node.js + Express
- **Base de données**: SQLite (better-sqlite3)
- **Frontend**: EJS (server-side rendering)
- **Authentification**: Passport.js + Google OAuth
- **Sessions**: express-session
- **Upload**: Multer

### Fonctionnalités identifiées
1. ✅ Authentification (email/password + Google OAuth)
2. ✅ Inscription avec vérification email
3. ✅ Gestion de sites avec hash unique
4. ✅ Contenu personnalisable (texte, images, vidéos, embeds)
5. ✅ Système d'invitations pour co-administrateurs
6. ✅ Protection par mot de passe public
7. ✅ Chiffrement de champs sensibles (AES-256-GCM)
8. ✅ Upload de fichiers (images, favicons)
9. ✅ Pages légales (CGU, Privacy, AUP)

### Structure de la base de données actuelle
- **users**: id, hash, username, email, password_hash, google_id, created_at
- **sites**: id, hash, user_id, public_password_enabled, public_password_hash, public_password, created_at, updated_at
- **site_content**: id, site_id, type, value, title, backgroundColor, backgroundImage, cardBackgroundColor, favicon, created_at, updated_at
- **site_invitations**: id, site_id, created_by, token, expires_at, used, used_by, used_at, created_at
- **site_admins**: id, site_id, user_id, created_at
- **pending_registrations**: id, username, email, password_hash, invite_token, verification_token, expires_at, created_at

---

## 🎯 Architecture cible proposée

### Stack cible
- **Backend**: AdonisJS 6 (TypeScript)
- **Base de données**: PostgreSQL 15+
- **ORM**: Lucid (intégré à AdonisJS)
- **Frontend**: Nuxt 3 + Vue 3 (Composition API)
- **Styling**: TailwindCSS
- **Authentification**: AdonisJS Auth (sessions)
- **API**: REST API avec AdonisJS

### Structure de dossiers proposée

```
qr-dynamic/
├── backend/                    # Application AdonisJS
│   ├── app/
│   │   ├── controllers/
│   │   │   ├── auth_controller.ts
│   │   │   ├── sites_controller.ts
│   │   │   ├── invitations_controller.ts
│   │   │   └── legal_controller.ts
│   │   ├── models/
│   │   │   ├── user.ts
│   │   │   ├── site.ts
│   │   │   ├── site_content.ts
│   │   │   ├── site_invitation.ts
│   │   │   ├── site_admin.ts
│   │   │   └── pending_registration.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── site_owner.ts
│   │   └── services/
│   │       ├── encryption_service.ts
│   │       ├── hash_service.ts
│   │       ├── mailer_service.ts
│   │       └── google_auth_service.ts
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── start/
│   │   └── routes.ts
│   └── config/
│       ├── database.ts
│       ├── auth.ts
│       └── mail.ts
│
├── frontend/                    # Application Nuxt 3
│   ├── components/
│   ├── pages/
│   ├── composables/
│   ├── utils/
│   └── assets/
│
└── shared/                      # Code partagé (types, constants)
    └── types/
```

---

## 📝 Étapes de migration détaillées

### **ÉTAPE 1 : Initialisation du backend AdonisJS**

#### Actions à effectuer
1. Créer un nouveau projet AdonisJS avec TypeScript
2. Configurer PostgreSQL
3. Installer les dépendances nécessaires

#### Commandes à exécuter
```bash
# Créer le projet AdonisJS
npm init adonisjs@latest backend -- --name=qr-dynamic-backend

# Installer le driver PostgreSQL
cd backend
npm install pg
npm install -D @types/pg

# Installer les packages supplémentaires
npm install @adonisjs/lucid
npm install @adonisjs/auth
npm install @adonisjs/mail
npm install @adonisjs/session
npm install @adonisjs/ally  # Pour Google OAuth
npm install bcrypt
npm install multer
npm install @types/bcrypt
npm install @types/multer
```

#### Fichiers de configuration à créer/modifier
- `backend/.env` - Variables d'environnement
- `backend/config/database.ts` - Configuration PostgreSQL
- `backend/config/auth.ts` - Configuration authentification
- `backend/config/mail.ts` - Configuration email

#### Validation requise
- [ ] Confirmer la structure de dossiers proposée
- [ ] Valider les versions des packages
- [ ] Confirmer les variables d'environnement nécessaires

---

### **ÉTAPE 2 : Migration du schéma de base de données**

#### Actions à effectuer
1. Créer les migrations Lucid pour toutes les tables
2. Convertir les types SQLite vers PostgreSQL
3. Gérer les contraintes et index

#### Différences SQLite → PostgreSQL
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY` ou `BIGSERIAL`
- `DATETIME DEFAULT CURRENT_TIMESTAMP` → `TIMESTAMP DEFAULT NOW()`
- `TEXT` → `VARCHAR` ou `TEXT` (PostgreSQL supporte TEXT nativement)
- `INTEGER` (booléen) → `BOOLEAN`

#### Migrations à créer
1. `create_users_table.ts`
2. `create_sites_table.ts`
3. `create_site_content_table.ts`
4. `create_site_invitations_table.ts`
5. `create_site_admins_table.ts`
6. `create_pending_registrations_table.ts`

#### Validation requise
- [ ] Valider le mapping des types
- [ ] Confirmer les contraintes de clés étrangères
- [ ] Valider les index à créer

---

### **ÉTAPE 3 : Création des modèles Lucid**

#### Actions à effectuer
1. Créer les modèles correspondant aux tables
2. Définir les relations (hasMany, belongsTo, manyToMany)
3. Configurer les hooks (beforeSave, afterFind) pour le chiffrement

#### Modèles à créer
1. **User** - Relations: hasMany(Site), manyToMany(Site via SiteAdmin)
2. **Site** - Relations: belongsTo(User), hasOne(SiteContent), hasMany(SiteInvitation), manyToMany(User via SiteAdmin)
3. **SiteContent** - Relations: belongsTo(Site)
4. **SiteInvitation** - Relations: belongsTo(Site), belongsTo(User)
5. **SiteAdmin** - Relations: belongsTo(Site), belongsTo(User)
6. **PendingRegistration** - Pas de relations

#### Points d'attention
- Chiffrement automatique des champs sensibles dans SiteContent
- Gestion des timestamps automatiques
- Validation des données

#### Validation requise
- [ ] Valider la structure des relations
- [ ] Confirmer les hooks de chiffrement
- [ ] Valider les validations de champs

---

### **ÉTAPE 4 : Migration des services utilitaires**

#### Services à créer/migrer
1. **EncryptionService** - Migrer `utils/encryption.js`
2. **HashService** - Migrer `utils/hash.js` (génération de hash uniques)
3. **MailerService** - Migrer `utils/mailer.js` avec AdonisJS Mail
4. **GoogleAuthService** - Adapter Passport vers AdonisJS Ally

#### Actions à effectuer
- Convertir JavaScript → TypeScript
- Adapter les APIs AdonisJS
- Maintenir la compatibilité avec les données existantes

#### Validation requise
- [ ] Valider la migration du chiffrement (compatibilité avec données existantes)
- [ ] Confirmer l'intégration avec AdonisJS Mail
- [ ] Valider l'intégration Google OAuth avec Ally

---

### **ÉTAPE 5 : Migration des contrôleurs**

#### Contrôleurs à créer
1. **AuthController**
   - `register()` - Inscription avec vérification email
   - `login()` - Connexion
   - `logout()` - Déconnexion
   - `verifyEmail()` - Vérification email
   - `googleAuth()` - Authentification Google
   - `googleCallback()` - Callback Google

2. **SitesController**
   - `index()` - Liste des sites
   - `show()` - Afficher un site public
   - `create()` - Créer un site
   - `update()` - Mettre à jour un site
   - `destroy()` - Supprimer un site
   - `getContent()` - API pour récupérer le contenu
   - `verifyPassword()` - Vérifier mot de passe public

3. **AdminController** (ou intégré dans SitesController)
   - `adminShow()` - Interface d'administration
   - `adminUpdate()` - Mise à jour depuis l'admin

4. **InvitationsController**
   - `create()` - Créer une invitation
   - `index()` - Lister les invitations
   - `destroy()` - Supprimer une invitation
   - `accept()` - Accepter une invitation
   - `showInvite()` - Page d'invitation

5. **LegalController**
   - `show()` - Afficher une page légale

#### Middleware à créer
1. **AuthMiddleware** - Vérifier l'authentification
2. **SiteOwnerMiddleware** - Vérifier la propriété du site

#### Validation requise
- [ ] Valider la structure des contrôleurs
- [ ] Confirmer les middlewares nécessaires
- [ ] Valider la gestion des erreurs

---

### **ÉTAPE 6 : Migration des routes**

#### Routes à créer
```typescript
// Auth
POST   /api/auth/register
GET    /api/auth/verify-email/:token
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/google
GET    /api/auth/google/callback

// Sites (public)
GET    /:hash
GET    /:hash/content
POST   /:hash/verify-password

// Sites (admin)
GET    /api/admin/:hashUser/sites
POST   /api/admin/:hashUser/sites
GET    /api/admin/:hashUser/sites/:hashSite
POST   /api/admin/:hashUser/sites/:hashSite
DELETE /api/admin/:hashUser/sites/:hashSite

// Invitations
POST   /api/admin/:hashUser/sites/:hashSite/invitations
GET    /api/admin/:hashUser/sites/:hashSite/invitations
DELETE /api/admin/:hashUser/sites/:hashSite/invitations/:id
GET    /invite/:token
POST   /api/invite/:token/accept

// Legal
GET    /terms-of-service
GET    /privacy-policy
GET    /acceptable-use-policy
```

#### Validation requise
- [ ] Valider la structure des routes
- [ ] Confirmer les préfixes API
- [ ] Valider la compatibilité avec le frontend

---

### **ÉTAPE 7 : Migration des données SQLite → PostgreSQL**

#### Script de migration à créer
1. Lire les données depuis SQLite
2. Transformer les types si nécessaire
3. Insérer dans PostgreSQL
4. Vérifier l'intégrité

#### Points d'attention
- Conversion des timestamps
- Gestion des booléens (0/1 → true/false)
- Préservation des hash uniques
- Migration des données chiffrées (doivent rester compatibles)

#### Validation requise
- [ ] Valider le script de migration
- [ ] Confirmer la stratégie de backup
- [ ] Valider les tests de migration

---

### **ÉTAPE 8 : Initialisation du frontend Nuxt 3**

#### Actions à effectuer
1. Créer un nouveau projet Nuxt 3
2. Configurer TailwindCSS
3. Configurer les composables pour l'API
4. Créer la structure de pages

#### Commandes à exécuter
```bash
npx nuxi@latest init frontend
cd frontend
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install @nuxtjs/tailwindcss
```

#### Structure de pages à créer
- `/` - Page d'accueil
- `/login` - Connexion
- `/register` - Inscription
- `/verify-email/:token` - Vérification email
- `/:hash` - Site public
- `/admin/:hashUser/sites` - Liste des sites
- `/admin/:hashUser/sites/:hashSite` - Administration
- `/invite/:token` - Page d'invitation
- `/terms-of-service` - CGU
- `/privacy-policy` - Privacy
- `/acceptable-use-policy` - AUP

#### Composables à créer
- `useAuth()` - Gestion de l'authentification
- `useApi()` - Client API
- `useSites()` - Gestion des sites

#### Validation requise
- [ ] Valider la structure du frontend
- [ ] Confirmer l'intégration TailwindCSS
- [ ] Valider la stratégie de gestion d'état

---

### **ÉTAPE 9 : Migration des composants Vue**

#### Composants à créer
1. **Auth**
   - `LoginForm.vue`
   - `RegisterForm.vue`
   - `GoogleAuthButton.vue`

2. **Sites**
   - `SitePreview.vue`
   - `SiteEditor.vue`
   - `SiteList.vue`
   - `PasswordProtection.vue`

3. **Admin**
   - `AdminStudio.vue` (équivalent de admin.ejs)
   - `ColorControls.vue`
   - `FileUpload.vue`
   - `ContentEditor.vue`

4. **Invitations**
   - `InvitationList.vue`
   - `InvitationForm.vue`

#### Validation requise
- [ ] Valider la structure des composants
- [ ] Confirmer l'utilisation de Composition API
- [ ] Valider l'intégration TailwindCSS

---

### **ÉTAPE 10 : Configuration et déploiement**

#### Actions à effectuer
1. Configuration CORS pour l'API
2. Configuration des variables d'environnement
3. Scripts de build et déploiement
4. Documentation de migration

#### Fichiers à créer
- `.env.example` pour backend et frontend
- `docker-compose.yml` (optionnel) pour PostgreSQL
- Documentation de migration

#### Validation requise
- [ ] Valider la configuration CORS
- [ ] Confirmer les variables d'environnement
- [ ] Valider les scripts de déploiement

---

## 🔄 Ordre d'exécution recommandé

1. ✅ **ÉTAPE 1** - Initialisation backend AdonisJS
2. ✅ **ÉTAPE 2** - Migration schéma base de données
3. ✅ **ÉTAPE 3** - Création modèles Lucid
4. ✅ **ÉTAPE 4** - Migration services utilitaires
5. ✅ **ÉTAPE 5** - Migration contrôleurs
6. ✅ **ÉTAPE 6** - Migration routes
7. ✅ **ÉTAPE 7** - Migration données (test sur copie)
8. ✅ **ÉTAPE 8** - Initialisation frontend Nuxt 3
9. ✅ **ÉTAPE 9** - Migration composants Vue
10. ✅ **ÉTAPE 10** - Configuration finale

---

## ⚠️ Points d'attention critiques

1. **Chiffrement** : Les données chiffrées doivent rester compatibles
2. **Hash uniques** : Préserver les hash existants lors de la migration
3. **Sessions** : Adapter le système de sessions Express vers AdonisJS
4. **Upload de fichiers** : Adapter Multer vers le système AdonisJS
5. **Google OAuth** : Migrer Passport vers AdonisJS Ally
6. **Timestamps** : Conversion SQLite DATETIME → PostgreSQL TIMESTAMP

---

## 📊 Checklist de validation finale

- [ ] Toutes les routes fonctionnent
- [ ] Authentification opérationnelle
- [ ] Migration des données réussie
- [ ] Chiffrement compatible
- [ ] Upload de fichiers fonctionnel
- [ ] Google OAuth opérationnel
- [ ] Frontend connecté à l'API
- [ ] Tests de régression passés
- [ ] Documentation à jour

---

## 🚀 Prochaines étapes

**Attendre votre validation pour commencer l'ÉTAPE 1**

Souhaitez-vous que je commence par l'ÉTAPE 1 (Initialisation du backend AdonisJS) ?

