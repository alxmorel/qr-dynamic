# QR Dynamic Backend

Backend API pour QR Dynamic construit avec AdonisJS 6, TypeScript et PostgreSQL.

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- PostgreSQL 15+
- npm ou yarn

### Installation

1. Installer les dépendances :
```bash
npm install
```

2. Configurer les variables d'environnement :
```bash
cp .env.example .env
```

3. Modifier le fichier `.env` avec vos paramètres :
- Configuration PostgreSQL
- Clés d'authentification
- Configuration email
- Google OAuth (optionnel)

4. Créer la base de données PostgreSQL :
```sql
CREATE DATABASE qr_dynamic;
```

5. Générer la clé d'application :
```bash
node ace generate:key
```

6. Exécuter les migrations :
```bash
npm run migrate
```

7. Démarrer le serveur de développement :
```bash
npm run dev
```

Le serveur sera accessible sur `http://localhost:3333`

## 📝 Scripts disponibles

- `npm run dev` - Démarrer le serveur en mode développement
- `npm run build` - Compiler TypeScript
- `npm start` - Démarrer le serveur en production
- `npm run migrate` - Exécuter les migrations
- `npm run migrate:rollback` - Annuler la dernière migration
- `npm run migrate:status` - Voir le statut des migrations

## 🏗️ Structure du projet

```
backend/
├── app/
│   ├── controllers/     # Contrôleurs
│   ├── models/          # Modèles Lucid
│   ├── middleware/      # Middleware personnalisés
│   └── services/        # Services métier
├── config/              # Fichiers de configuration
├── database/
│   ├── migrations/      # Migrations de base de données
│   └── seeders/         # Seeders
├── start/               # Fichiers de démarrage
└── server.ts            # Point d'entrée du serveur
```

## 🔧 Configuration

Les fichiers de configuration se trouvent dans le dossier `config/` :
- `database.ts` - Configuration PostgreSQL
- `auth.ts` - Configuration authentification
- `mail.ts` - Configuration email
- `session.ts` - Configuration sessions
- `ally.ts` - Configuration OAuth (Google)

## 📚 Documentation

- [AdonisJS Documentation](https://docs.adonisjs.com/)
- [Lucid ORM](https://docs.adonisjs.com/guides/database/introduction)

