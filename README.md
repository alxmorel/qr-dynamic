# QR Dynamic - Application Multi-Utilisateurs

Application web permettant à chaque utilisateur de créer et gérer son propre site personnalisé avec un hash unique.

## 🚀 Fonctionnalités

- ✅ Système d'authentification (inscription/connexion) avec validation email
- ✅ Connexion sociale via Google (création + connexion)
- ✅ Chaque utilisateur peut créer et gérer plusieurs sites
- ✅ Interface d'administration : `/admin/<hashUser>/sites/<hashSite>`
- ✅ Liste des sites : `/admin/<hashUser>/sites`
- ✅ Site public : `/<hashSite>`
- ✅ Isolation complète des données entre utilisateurs
- ✅ Personnalisation complète (texte, images, vidéos, embeds)
- ✅ Gestion des favicons et images de fond
- ✅ Création et suppression de sites

## 📋 Prérequis

- Node.js (version 14 ou supérieure)
- npm

## 🔧 Installation

1. Cloner ou télécharger le projet
2. Installer les dépendances :
```bash
npm install
```

3. Créer un fichier `.env` à la racine du projet :
```bash
cp .env.example .env
```

4. Configurer les variables d'environnement dans `.env` :
```env
SESSION_SECRET=votre_secret_session_aleatoire_et_long
SMTP_HOST=smtp.votre-fournisseur.com
SMTP_PORT=587
SMTP_USER=utilisateur
SMTP_PASS=mot_de_passe
SMTP_SECURE=false
MAIL_FROM="QR Dynamic <no-reply@qr-dynamic.local>"
APP_BASE_URL=https://qr-dynamic.exemple.com
GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
# Optionnel si différent de APP_BASE_URL/auth/google/callback
# GOOGLE_CALLBACK_URL=https://qr-dynamic.exemple.com/auth/google/callback
```

`APP_BASE_URL` est utilisé pour générer les liens de vérification d'email. Si vous ne le définissez pas, l'application utilisera automatiquement l'URL de la requête en cours.
`GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont requis pour activer la connexion Google OAuth. L'URL de callback est par défaut `<APP_BASE_URL>/auth/google/callback` (ou `http://localhost:3000/auth/google/callback` en local).

## 🗄️ Migration des Données Existantes

### Migration du contenu existant

Si vous avez un fichier `content.json` existant à migrer :

```bash
node migrate.js
```

Ce script va :
- Créer un utilisateur admin par défaut
- Créer un site avec un hash unique
- Migrer le contenu de `content.json` vers la base de données
- Déplacer les fichiers uploadés vers la structure organisée

**⚠️ Important** : Le mot de passe par défaut de l'admin est `admin123`. Changez-le immédiatement après la première connexion !

### Migration des hash utilisateurs

Si vous avez des utilisateurs existants sans hash, exécutez :

```bash
node migrate-user-hashes.js
```

Ce script va ajouter un hash unique à tous les utilisateurs qui n'en ont pas encore.

## 🏃 Démarrage

```bash
node server.js
```

L'application sera accessible sur `http://localhost:3000`

## 📖 Utilisation

### Pour les Utilisateurs

1. **Créer un compte** : Accédez à `/register` et remplissez le formulaire
2. **Se connecter** : Utilisez `/login` avec votre email/username et mot de passe
3. **Gérer vos sites** : Une fois connecté, vous êtes redirigé vers `/admin/<votre-hash>/sites`
4. **Créer un nouveau site** : Cliquez sur "Créer un nouveau site" depuis la liste
5. **Administrer un site** : Cliquez sur "Administrer" pour modifier le contenu d'un site
6. **Partager un site** : Partagez le lien `/<hashSite>` pour que d'autres puissent voir votre site

### Connexion via Google

1. Configurez `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` (et autorisez l'URL de callback dans Google Cloud).
2. Sur `/login` ou `/register`, cliquez sur "Continuer avec Google".
3. Lors de l'acceptation d'une invitation (`/invite/:token`), le lien Google transmet automatiquement le jeton pour finaliser l'accès après authentification.

### Structure des Routes

- `GET /` - Page d'accueil
- `GET /register` - Formulaire d'inscription
- `POST /register` - Traitement de l'inscription (envoi du lien de vérification)
- `GET /verify-email/:token` - Vérification de l'email et création du compte
- `GET /login` - Formulaire de connexion
- `POST /login` - Traitement de la connexion
- `GET /logout` - Déconnexion
- `GET /:hashSite` - Site public (affichage)
- `GET /admin/:hashUser/sites` - Liste des sites de l'utilisateur (protégée)
- `POST /admin/:hashUser/sites` - Créer un nouveau site (protégée)
- `GET /admin/:hashUser/sites/:hashSite` - Interface d'administration d'un site (protégée)
- `POST /admin/:hashUser/sites/:hashSite` - Mise à jour du contenu (protégée)
- `DELETE /admin/:hashUser/sites/:hashSite` - Supprimer un site (protégée)

## 🔒 Sécurité

- Les mots de passe sont hashés avec bcrypt
- Chaque utilisateur ne peut accéder qu'à ses propres sites
- Vérification de propriété sur toutes les routes d'administration
- Sessions sécurisées avec express-session

## 📁 Structure du Projet

```
qr-dynamic/
├── database.js          # Configuration et requêtes SQLite
├── server.js            # Serveur Express principal
├── migrate.js           # Script de migration du contenu
├── migrate-user-hashes.js  # Script de migration des hash utilisateurs
├── utils/
│   ├── auth.js         # Fonctions d'authentification
│   └── hash.js         # Génération de hash uniques
├── views/              # Templates EJS
│   ├── home.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── admin.ejs
│   ├── sites-list.ejs  # Liste des sites
│   ├── index.ejs
│   └── components/     # Composants réutilisables
├── public/             # Fichiers statiques
├── uploads/            # Fichiers uploadés (organisés par user_id/hash)
└── database.db         # Base de données SQLite (créée automatiquement)
```

## 🗃️ Base de Données

L'application utilise SQLite avec plusieurs tables :

- **users** : Informations des utilisateurs
- **sites** : Sites créés par les utilisateurs (avec hash unique)
- **site_content** : Contenu de chaque site
- **pending_registrations** : Inscriptions en attente de vérification d'email
- **site_invitations / site_admins** : Gestion des invitations et co-administrateurs

## 🛠️ Développement

### Ajouter un nouveau type de contenu

1. Modifier `views/admin.ejs` pour ajouter l'option dans le select
2. Modifier `views/index.ejs` pour gérer l'affichage
3. Ajouter la conversion d'URL si nécessaire dans `server.js`

### Modifier le schéma de base de données

1. Modifier les requêtes dans `database.js`
2. Créer un script de migration si nécessaire
3. Tester sur une base de données de développement

## 📝 Notes

- Les fichiers uploadés sont organisés par `uploads/<user_id>/<site_hash>/`
- Les hash de sites sont générés automatiquement et ne peuvent pas être modifiés
- Un utilisateur peut avoir plusieurs sites (fonctionnalité future)

## 🐛 Dépannage

### Erreur "Base de données verrouillée"
- Vérifiez qu'aucun autre processus n'utilise `database.db`
- Redémarrez le serveur

### Erreur "SESSION_SECRET non défini"
- Créez un fichier `.env` avec `SESSION_SECRET=votre_secret`

### Les fichiers uploadés ne s'affichent pas
- Vérifiez les permissions du dossier `uploads/`
- Vérifiez que les chemins dans la base de données sont corrects

## 📄 Licence

ISC

