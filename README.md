# QR Dynamic - Application Multi-Utilisateurs

Application web permettant à chaque utilisateur de créer et gérer son propre site personnalisé avec un hash unique.

## 🚀 Fonctionnalités

- ✅ Système d'authentification (inscription/connexion)
- ✅ Chaque utilisateur possède son propre site avec un hash unique
- ✅ Interface d'administration : `/admin/<hash>`
- ✅ Site public : `/<hash>`
- ✅ Isolation complète des données entre utilisateurs
- ✅ Personnalisation complète (texte, images, vidéos, embeds)
- ✅ Gestion des favicons et images de fond

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
```

## 🗄️ Migration des Données Existantes

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

## 🏃 Démarrage

```bash
node server.js
```

L'application sera accessible sur `http://localhost:3000`

## 📖 Utilisation

### Pour les Utilisateurs

1. **Créer un compte** : Accédez à `/register` et remplissez le formulaire
2. **Se connecter** : Utilisez `/login` avec votre email/username et mot de passe
3. **Gérer son site** : Une fois connecté, vous êtes redirigé vers `/admin/<votre-hash>`
4. **Partager son site** : Partagez le lien `/<votre-hash>` pour que d'autres puissent voir votre site

### Structure des Routes

- `GET /` - Page d'accueil
- `GET /register` - Formulaire d'inscription
- `POST /register` - Traitement de l'inscription
- `GET /login` - Formulaire de connexion
- `POST /login` - Traitement de la connexion
- `GET /logout` - Déconnexion
- `GET /:hash` - Site public (affichage)
- `GET /admin/:hash` - Interface d'administration (protégée)
- `POST /admin/:hash` - Mise à jour du contenu (protégée)

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
├── migrate.js           # Script de migration
├── utils/
│   ├── auth.js         # Fonctions d'authentification
│   └── hash.js         # Génération de hash uniques
├── views/              # Templates EJS
│   ├── home.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── admin.ejs
│   └── index.ejs
├── public/             # Fichiers statiques
├── uploads/            # Fichiers uploadés (organisés par user_id/hash)
└── database.db         # Base de données SQLite (créée automatiquement)
```

## 🗃️ Base de Données

L'application utilise SQLite avec 3 tables principales :

- **users** : Informations des utilisateurs
- **sites** : Sites créés par les utilisateurs (avec hash unique)
- **site_content** : Contenu de chaque site

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

