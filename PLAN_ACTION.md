# Plan d'Action - Transformation en Application Multi-Utilisateurs

## Vue d'ensemble
Transformation de l'application QR Dynamic actuelle (mono-utilisateur) en une plateforme multi-utilisateurs où chaque utilisateur possède son propre site identifié par un hash unique.

---

## Phase 1 : Architecture de Base de Données

### 1.1 Choix de la base de données
- **Option recommandée** : SQLite (simple, pas de serveur séparé, suffisant pour commencer)
- **Alternative** : PostgreSQL/MySQL si besoin de scalabilité future

### 1.2 Schéma de base de données

#### Table `users`
```sql
- id (INTEGER PRIMARY KEY)
- username (TEXT UNIQUE NOT NULL)
- email (TEXT UNIQUE NOT NULL)
- password_hash (TEXT NOT NULL) - hash bcrypt
- created_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
```

#### Table `sites`
```sql
- id (INTEGER PRIMARY KEY)
- hash (TEXT UNIQUE NOT NULL) - identifiant unique du site
- user_id (INTEGER NOT NULL, FOREIGN KEY -> users.id)
- created_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
- updated_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
```

#### Table `site_content`
```sql
- id (INTEGER PRIMARY KEY)
- site_id (INTEGER NOT NULL, FOREIGN KEY -> sites.id)
- type (TEXT NOT NULL) - 'text', 'image', 'video', 'embed'
- value (TEXT)
- title (TEXT)
- backgroundColor (TEXT)
- backgroundImage (TEXT)
- cardBackgroundColor (TEXT)
- favicon (TEXT)
- created_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
- updated_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
```

### 1.3 Actions
- [ ] Installer `sqlite3` ou `better-sqlite3`
- [ ] Créer le fichier de base de données `database.db`
- [ ] Créer le script de migration/initialisation
- [ ] Créer les modèles de données (User, Site, SiteContent)

---

## Phase 2 : Système d'Authentification

### 2.1 Inscription
- [ ] Créer la route `GET /register` (formulaire d'inscription)
- [ ] Créer la route `POST /register` (traitement de l'inscription)
- [ ] Valider les données (email valide, mot de passe fort)
- [ ] Hasher les mots de passe avec `bcrypt`
- [ ] Générer automatiquement un hash unique pour le site lors de l'inscription
- [ ] Créer le site par défaut pour le nouvel utilisateur
- [ ] Créer la vue `views/register.ejs`

### 2.2 Connexion
- [ ] Modifier la route `GET /login` pour afficher le formulaire
- [ ] Modifier la route `POST /login` pour authentifier avec email/username + password
- [ ] Stocker `user_id` dans la session au lieu de `authenticated: true`
- [ ] Rediriger vers `/admin/<hash>` après connexion

### 2.3 Gestion de session
- [ ] Modifier `requireAuth` pour vérifier `req.session.user_id`
- [ ] Ajouter une fonction `getCurrentUser(req)` pour récupérer l'utilisateur
- [ ] Ajouter une fonction `requireSiteOwner(req, hash)` pour vérifier la propriété

### 2.4 Actions
- [ ] Installer `bcrypt` pour le hachage des mots de passe
- [ ] Créer les utilitaires d'authentification
- [ ] Mettre à jour les vues de connexion

---

## Phase 3 : Gestion Multi-Sites

### 3.1 Génération de hash unique
- [ ] Créer une fonction `generateUniqueHash()` 
- [ ] Utiliser crypto pour générer un hash aléatoire (ex: 8-12 caractères)
- [ ] Vérifier l'unicité dans la base de données
- [ ] Format recommandé : alphanumérique (ex: `a3f9k2m8`)

### 3.2 Routes publiques
- [ ] Modifier `GET /` pour rediriger vers une page d'accueil ou liste des sites
- [ ] Créer `GET /:hash` pour afficher le site public
- [ ] Vérifier que le hash existe dans la base de données
- [ ] Charger le contenu du site depuis `site_content`
- [ ] Rendre la vue `index.ejs` avec le contenu du site

### 3.3 Routes d'administration
- [ ] Créer `GET /admin/:hash` pour l'interface d'administration
- [ ] Vérifier que l'utilisateur est propriétaire du site (sécurité critique)
- [ ] Charger le contenu actuel du site
- [ ] Créer/modifier la vue `admin.ejs` pour gérer le contenu

### 3.4 Mise à jour du contenu
- [ ] Modifier `POST /admin/:hash` pour sauvegarder dans la base de données
- [ ] Vérifier la propriété du site avant modification
- [ ] Gérer les uploads de fichiers (organiser par site/user)
- [ ] Mettre à jour `updated_at` dans la base de données

### 3.5 Actions
- [ ] Créer les middlewares de sécurité
- [ ] Organiser les uploads par utilisateur/site
- [ ] Mettre à jour les routes existantes

---

## Phase 4 : Sécurité et Isolation

### 4.1 Vérification de propriété
- [ ] Créer middleware `requireSiteOwner(req, res, next, hash)`
- [ ] Vérifier que `req.session.user_id` correspond au `user_id` du site
- [ ] Retourner 403 si l'utilisateur n'est pas propriétaire
- [ ] Appliquer ce middleware sur toutes les routes `/admin/:hash`

### 4.2 Protection CSRF
- [ ] Installer `csurf` ou utiliser `express-session` avec tokens
- [ ] Ajouter des tokens CSRF aux formulaires
- [ ] Valider les tokens sur les routes POST

### 4.3 Validation des données
- [ ] Valider tous les inputs utilisateur
- [ ] Sanitizer les données avant insertion en BDD
- [ ] Limiter la taille des uploads
- [ ] Valider les types de fichiers

### 4.4 Actions
- [ ] Implémenter les middlewares de sécurité
- [ ] Tester l'isolation entre utilisateurs
- [ ] Ajouter la gestion d'erreurs appropriée

---

## Phase 5 : Interface Utilisateur

### 5.1 Page d'accueil
- [ ] Créer `GET /` - page d'accueil avec possibilité de connexion/inscription
- [ ] Afficher les informations sur le service
- [ ] Liens vers login/register

### 5.2 Dashboard utilisateur (optionnel)
- [ ] Créer `GET /dashboard` pour lister tous les sites de l'utilisateur
- [ ] Permettre la création de nouveaux sites (si besoin)
- [ ] Afficher les statistiques basiques

### 5.3 Interface d'administration
- [ ] Adapter `views/admin.ejs` pour fonctionner avec le hash
- [ ] Afficher le hash du site dans l'interface
- [ ] Ajouter un lien vers le site public
- [ ] Améliorer l'UX (messages de succès, validation)

### 5.4 Actions
- [ ] Créer/mettre à jour les vues EJS
- [ ] Améliorer le CSS si nécessaire
- [ ] Ajouter des messages flash pour les retours utilisateur

---

## Phase 6 : Migration des Données Existantes

### 6.1 Migration du contenu actuel
- [ ] Créer un script de migration
- [ ] Lire `content.json` existant
- [ ] Créer un utilisateur admin par défaut
- [ ] Créer un site avec un hash
- [ ] Migrer le contenu vers `site_content`

### 6.2 Actions
- [ ] Écrire le script de migration
- [ ] Tester la migration
- [ ] Sauvegarder `content.json` comme backup

---

## Phase 7 : Tests et Optimisations

### 7.1 Tests fonctionnels
- [ ] Tester l'inscription d'un nouvel utilisateur
- [ ] Tester la connexion
- [ ] Tester l'accès public à un site
- [ ] Tester l'administration d'un site
- [ ] Tester l'isolation (utilisateur A ne peut pas accéder au site de B)
- [ ] Tester les uploads de fichiers

### 7.2 Optimisations
- [ ] Optimiser les requêtes SQL (indexes sur hash, user_id)
- [ ] Mettre en cache les contenus statiques si nécessaire
- [ ] Nettoyer les fichiers uploadés orphelins

### 7.3 Actions
- [ ] Créer des scénarios de test
- [ ] Documenter les cas d'usage
- [ ] Optimiser les performances

---

## Phase 8 : Déploiement et Documentation

### 8.1 Configuration
- [ ] Mettre à jour `.env` avec les nouvelles variables
- [ ] Documenter les variables d'environnement nécessaires
- [ ] Créer un fichier `.env.example`

### 8.2 Documentation
- [ ] Mettre à jour le README.md
- [ ] Documenter l'architecture
- [ ] Documenter les routes API
- [ ] Créer un guide d'utilisation

### 8.3 Actions
- [ ] Finaliser la configuration
- [ ] Rédiger la documentation
- [ ] Préparer le déploiement

---

## Ordre d'Implémentation Recommandé

1. **Phase 1** : Base de données (fondation)
2. **Phase 2** : Authentification (sécurité de base)
3. **Phase 3** : Multi-sites (fonctionnalité principale)
4. **Phase 4** : Sécurité (critique avant déploiement)
5. **Phase 5** : Interface (amélioration UX)
6. **Phase 6** : Migration (si données existantes)
7. **Phase 7** : Tests (validation)
8. **Phase 8** : Documentation (finalisation)

---

## Dépendances à Ajouter

```json
{
  "bcrypt": "^5.1.1",
  "better-sqlite3": "^11.0.0",
  "csurf": "^1.11.0" (ou alternative moderne)
}
```

---

## Notes Importantes

- **Sécurité** : La vérification de propriété est CRITIQUE. Un utilisateur ne doit JAMAIS pouvoir accéder ou modifier un site qui ne lui appartient pas.
- **Hash unique** : Le hash doit être suffisamment long et aléatoire pour éviter les collisions et les accès non autorisés par devinette.
- **Uploads** : Organiser les fichiers par `uploads/<user_id>/<site_hash>/` pour une meilleure organisation.
- **Scalabilité** : SQLite convient pour commencer, mais prévoir une migration vers PostgreSQL si le nombre d'utilisateurs augmente.

---

## Questions à Résoudre

- [ ] Un utilisateur peut-il avoir plusieurs sites ? (recommandé : OUI)
- [ ] Le hash doit-il être modifiable par l'utilisateur ? (recommandé : NON, pour la sécurité)
- [ ] Faut-il un système de permissions (lecture seule, etc.) ? (pour plus tard)
- [ ] Faut-il un système de thèmes prédéfinis ? (amélioration future)

