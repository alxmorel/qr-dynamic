# Architecture - Application Multi-Utilisateurs

## Schéma des Routes

```
GET  /                    → Page d'accueil (login/register)
GET  /register            → Formulaire d'inscription
POST /register            → Traitement de l'inscription
GET  /login               → Formulaire de connexion
POST /login               → Traitement de la connexion
GET  /logout              → Déconnexion
GET  /dashboard           → Liste des sites de l'utilisateur (optionnel)

GET  /:hash               → Site public (affichage du contenu)
GET  /admin/:hash         → Interface d'administration (protégée)
POST /admin/:hash         → Mise à jour du contenu (protégée)
```

## Flux d'Utilisation

### 1. Inscription d'un Nouvel Utilisateur
```
Utilisateur → /register → Création compte → Génération hash unique 
→ Création site par défaut → Redirection /admin/<hash>
```

### 2. Connexion
```
Utilisateur → /login → Authentification → Session créée 
→ Redirection /admin/<hash> (premier site) ou /dashboard
```

### 3. Consultation d'un Site Public
```
Visiteur → /<hash> → Vérification hash existe → Chargement contenu 
→ Affichage site public
```

### 4. Administration d'un Site
```
Utilisateur connecté → /admin/<hash> → Vérification propriété 
→ Chargement contenu → Modification → Sauvegarde BDD
```

## Structure de la Base de Données

```
users
├── id
├── username
├── email
├── password_hash
└── created_at

sites
├── id
├── hash (UNIQUE) ← Identifiant public du site
├── user_id (FK → users.id)
├── created_at
└── updated_at

site_content
├── id
├── site_id (FK → sites.id)
├── type (text/image/video/embed)
├── value
├── title
├── backgroundColor
├── backgroundImage
├── cardBackgroundColor
├── favicon
├── created_at
└── updated_at
```

## Middlewares de Sécurité

### requireAuth
```javascript
Vérifie que req.session.user_id existe
Sinon → redirection /login
```

### requireSiteOwner
```javascript
Vérifie que req.session.user_id === site.user_id
Sinon → 403 Forbidden
```

## Organisation des Fichiers Uploadés

```
uploads/
├── <user_id>/
│   ├── <site_hash>/
│   │   ├── background-*.jpg
│   │   └── favicon-*.png
│   └── <site_hash_2>/
│       └── ...
└── ...
```

## Exemple de Hash

- Format : Alphanumérique, 8-12 caractères
- Exemples : `a3f9k2m8`, `x7b4n9q1`, `m2k8p5r3`
- Génération : Crypto.randomBytes → base64url ou hex
- Unicité : Vérifiée dans la base de données avant création

## Isolation des Données

```
Utilisateur A (user_id: 1)
├── Site 1 (hash: abc123)
└── Site 2 (hash: def456)

Utilisateur B (user_id: 2)
├── Site 3 (hash: ghi789)
└── Site 4 (hash: jkl012)

→ Utilisateur A ne peut accéder qu'à /admin/abc123 et /admin/def456
→ Utilisateur B ne peut accéder qu'à /admin/ghi789 et /admin/jkl012
→ Tous peuvent consulter les sites publics : /abc123, /def456, /ghi789, /jkl012
```

## Séquence d'Authentification

```
1. POST /login
   ├── Vérifier email/username + password
   ├── Comparer password_hash avec bcrypt
   ├── Créer session : req.session.user_id = user.id
   └── Rediriger vers /admin/<hash> ou /dashboard

2. GET /admin/:hash
   ├── requireAuth → Vérifier session
   ├── requireSiteOwner → Vérifier propriété
   ├── Charger site depuis BDD
   └── Rendre vue admin avec contenu
```

## Gestion des Erreurs

- **404** : Hash introuvable dans la base de données
- **403** : Tentative d'accès à un site non propriétaire
- **401** : Non authentifié (redirection /login)
- **400** : Données invalides (validation échouée)
- **500** : Erreur serveur (logger et afficher message générique)

