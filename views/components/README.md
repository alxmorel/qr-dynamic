# Composants EJS pour la page Admin

Ce dossier contient les composants fragmentés de la page d'administration pour faciliter la maintenance.

## Structure des composants

### `head.ejs`
Contient la balise `<head>` avec :
- Les meta tags
- Le favicon (dynamique ou par défaut)
- Les liens CSS (style.css, Font Awesome, Quill.js)

### `toaster.ejs`
Composant de notification toast pour afficher les messages de succès.

### `site-info.ejs`
Section d'information du site affichant :
- Le hash du site
- Le lien public avec boutons de copie et partage
- Le message de succès (si présent)

### `form-favicon.ejs`
Section du formulaire pour gérer l'icône du site (favicon) :
- Prévisualisation de l'icône actuelle
- Bouton de suppression
- Upload de nouvelle icône

### `form-content.ejs`
Section du formulaire pour le contenu principal :
- Titre du site
- Type de contenu (texte, image, vidéo, embed)
- Éditeur de texte riche (Quill.js) ou champ texte simple

### `form-card-customization.ejs`
Section de personnalisation de la carte :
- Sélecteur de couleur de fond
- Contrôle d'opacité
- Support des valeurs hex et rgba

### `form-background.ejs`
Section de personnalisation du fond :
- Sélecteur de couleur de fond
- Upload d'image de fond
- Prévisualisation et suppression de l'image actuelle

### `form-password.ejs`
Section de protection par mot de passe :
- Activation/désactivation de la protection
- Champ de mot de passe avec affichage/masquage
- Validation et gestion de l'affichage conditionnel

### `admin-scripts.ejs`
Tous les scripts JavaScript nécessaires :
- Initialisation de Quill.js
- Gestion des interactions du formulaire
- Synchronisation des colorpickers
- Gestion des événements (suppression, upload, etc.)
- Fonctions utilitaires (copie, partage, etc.)

## Variables nécessaires

Les composants utilisent les variables suivantes (passées depuis `server.js`) :

- `content` : Objet contenant les données du contenu (title, type, value, favicon, etc.)
- `site` : Objet contenant les informations du site (hash, user_id, etc.)
- `publicUrl` : URL publique du site
- `success` : Booléen indiquant si la mise à jour a réussi
- `publicPasswordEnabled` : Booléen indiquant si la protection par mot de passe est activée
- `publicPassword` : Mot de passe public (si défini)

## Utilisation

Le fichier principal `admin.ejs` inclut tous ces composants en utilisant la syntaxe EJS :

```ejs
<%- include('components/nom-du-composant') %>
```

Les variables sont automatiquement disponibles dans tous les composants inclus.

## Avantages de cette structure

1. **Maintenabilité** : Chaque section est isolée et facile à modifier
2. **Réutilisabilité** : Les composants peuvent être réutilisés dans d'autres vues si nécessaire
3. **Lisibilité** : Le fichier principal est beaucoup plus court et clair
4. **Testabilité** : Chaque composant peut être testé indépendamment
5. **Collaboration** : Plusieurs développeurs peuvent travailler sur différents composants simultanément

