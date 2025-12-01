# Guide de test du backend AdonisJS

## ✅ Corrections effectuées

- ✅ Correction de `view.render()` → `response.view()`
- ✅ Correction de `view.redirect()` → `response.redirect()`
- ✅ Tous les contrôleurs corrigés

## 🚀 Démarrage du serveur

### 1. Vérifier que PostgreSQL est démarré

Si vous utilisez Docker :
```powershell
docker ps
# Vérifier que le conteneur postgres-qr-dynamic est en cours d'exécution
```

Si le conteneur n'est pas démarré :
```powershell
docker start postgres-qr-dynamic
```

### 2. Vérifier les migrations

```powershell
npm run migrate:status
```

Si les migrations ne sont pas exécutées :
```powershell
npm run migrate
```

### 3. Démarrer le serveur

```powershell
npm run dev
```

Le serveur devrait démarrer sur `http://localhost:3333`

## ⚠️ Notes importantes

### Vues manquantes

Les contrôleurs utilisent des vues (templates) qui n'existent pas encore :
- `home` - Page d'accueil
- `register` - Page d'inscription
- `login` - Page de connexion
- `verify-email` - Page de vérification d'email
- `index` - Page d'affichage d'un site
- `admin` - Page d'administration d'un site
- `sites-list` - Liste des sites
- `invite` - Page d'invitation
- `invite-success` - Succès d'invitation
- `invite-error` - Erreur d'invitation

**Pour l'instant, ces vues retourneront des erreurs 404.** 

### Solutions temporaires

1. **Option 1 : Retourner du JSON au lieu de vues**
   - Modifier les contrôleurs pour retourner `response.json()` au lieu de `response.view()`
   - Utile pour tester les APIs

2. **Option 2 : Créer des vues basiques**
   - Créer des templates Edge minimalistes dans `resources/views/`
   - AdonisJS utilise Edge comme moteur de template

3. **Option 3 : Tester uniquement les routes API**
   - Tester les routes qui retournent du JSON (ex: `/api/*`)
   - Ignorer les routes qui nécessitent des vues

## 🧪 Tests à effectuer

### Routes API (JSON)

1. **Créer un site** (nécessite authentification)
   ```bash
   POST /admin/:hashUser/sites
   ```

2. **Récupérer le contenu d'un site**
   ```bash
   GET /:hash/content
   ```

3. **Vérifier le mot de passe public**
   ```bash
   POST /:hash/verify-password
   Body: { "password": "public123" }
   ```

### Routes nécessitant des vues

Ces routes nécessitent des templates Edge :
- `GET /` - Page d'accueil
- `GET /register` - Inscription
- `GET /login` - Connexion
- `GET /:hash` - Affichage d'un site
- `GET /admin/:hashUser/sites` - Liste des sites
- `GET /admin/:hashUser/sites/:hashSite` - Admin d'un site

## 🔧 Prochaines étapes

1. **Installer Edge** (moteur de template)
   ```bash
   npm install @adonisjs/view
   ```

2. **Créer les vues basiques** dans `resources/views/`

3. **Ou convertir en API pure** en retournant du JSON partout

## 📝 Commandes utiles

```bash
# Voir les routes disponibles
npx tsx ace.ts list:routes

# Voir le statut des migrations
npm run migrate:status

# Exécuter les seeders (créer des données de test)
npm run db:seed
```

