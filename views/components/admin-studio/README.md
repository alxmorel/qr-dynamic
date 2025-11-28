# Admin Studio - Structure modulaire

Ce dossier contient tous les sous-composants du script d'administration studio, fragmentés pour faciliter la maintenance.

## Structure

Chaque module est dans son propre dossier avec :
- `script.ejs` : Le code JavaScript du module
- `style.css` (optionnel) : Les styles CSS associés au module

## Modules

### 1. `preview-state/`
Gestion de l'état initial et du state de prévisualisation.
- Initialise `window.AdminStudio.previewState`
- Initialise `window.AdminStudio.previewElements`
- Expose `window.AdminStudio.syncState()`

### 2. `url-normalizer/`
Normalisation des URLs YouTube et Spotify.
- `normalizeYoutubeUrl()` : Convertit les URLs YouTube en format embed
- `normalizeSpotifyUrl()` : Convertit les URLs Spotify en format embed

### 3. `preview-renderer/`
Rendu de la prévisualisation en temps réel.
- `renderPreview()` : Met à jour l'affichage de la prévisualisation
- `buildPreviewContent()` : Construit le HTML du contenu

### 4. `content-editor/`
Éditeur de contenu avec Quill.js et gestion des types de contenu.
- Initialise l'éditeur Quill
- Gère les différents types de contenu (text, image, video, embed)
- Synchronise les changements avec l'état

### 5. `file-upload/`
Gestion de l'upload de fichiers (drag & drop).
- Upload d'images de fond
- Upload de favicon
- Upload d'images de contenu
- Styles CSS associés

### 6. `color-controls/`
Contrôles de couleur pour le fond et la carte.
- Sélecteur de couleur de fond
- Sélecteur de couleur de carte avec opacité
- Conversion hex/rgba
- Styles CSS associés

### 7. `panel-manager/`
Gestion des panels/tabs de l'interface.
- Navigation entre les sections (Contenu, Apparence, Sécurité)
- Sauvegarde de l'état dans localStorage

### 8. `preview-modes/`
Modes de prévisualisation (desktop/mobile).
- Bascule entre les modes desktop et mobile
- Mise à jour de l'attribut `data-mode`

### 9. `form-handler/`
Gestion de la soumission du formulaire.
- Préparation des données avant soumission
- Gestion de la suppression de favicon/background

### 10. `password-manager/`
Gestion du mot de passe public.
- Activation/désactivation du mot de passe
- Affichage/masquage du mot de passe
- Styles CSS associés

### 11. `ui-helpers/`
Helpers UI (copie, toaster, dropdown).
- Copie d'URL dans le presse-papiers
- Partage de message
- Affichage du toaster de succès
- Dropdown de personnalisation
- Styles CSS associés

## Utilisation

Le fichier principal `admin-studio-scripts.ejs` importe automatiquement tous les modules dans le bon ordre. Aucune modification n'est nécessaire dans `admin.ejs`.

## Ordre d'exécution

1. `preview-state` - Initialise l'état
2. `url-normalizer` - Définit les fonctions de normalisation
3. `preview-renderer` - Définit le rendu (dépend de preview-state et url-normalizer)
4. `content-editor` - Initialise l'éditeur (dépend de preview-state)
5. `file-upload` - Initialise les uploads (dépend de preview-state)
6. `color-controls` - Initialise les contrôles (dépend de preview-state)
7. `panel-manager` - Initialise les panels
8. `preview-modes` - Initialise les modes
9. `form-handler` - Initialise le formulaire (dépend de content-editor)
10. `password-manager` - Initialise le mot de passe
11. `ui-helpers` - Initialise les helpers

## API globale

Tous les modules exposent leurs fonctionnalités via `window.AdminStudio` :

```javascript
window.AdminStudio.previewState      // État de prévisualisation
window.AdminStudio.previewElements   // Références DOM
window.AdminStudio.syncState()       // Synchroniser l'état
window.AdminStudio.renderPreview()   // Rendre la prévisualisation
window.AdminStudio.quill             // Instance Quill
window.AdminStudio.normalizeYoutubeUrl()
window.AdminStudio.normalizeSpotifyUrl()
```

