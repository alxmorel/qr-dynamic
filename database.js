const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// Activer les clés étrangères
db.pragma('foreign_keys = ON');

// Initialiser la base de données (créer les tables si elles n'existent pas)
function initializeDatabase() {
  // Table users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table sites
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      public_password_enabled INTEGER DEFAULT 0,
      public_password_hash TEXT,
      public_password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  // Migration : Ajouter les colonnes pour le mot de passe public si elles n'existent pas
  try {
    db.exec(`
      ALTER TABLE sites ADD COLUMN public_password_enabled INTEGER DEFAULT 0;
    `);
  } catch (e) {
    // La colonne existe déjà, ignorer l'erreur
  }
  
  try {
    db.exec(`
      ALTER TABLE sites ADD COLUMN public_password_hash TEXT;
    `);
  } catch (e) {
    // La colonne existe déjà, ignorer l'erreur
  }
  
  try {
    db.exec(`
      ALTER TABLE sites ADD COLUMN public_password TEXT;
    `);
  } catch (e) {
    // La colonne existe déjà, ignorer l'erreur
  }

  // Table site_content
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      value TEXT,
      title TEXT,
      backgroundColor TEXT,
      backgroundImage TEXT,
      cardBackgroundColor TEXT,
      favicon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    )
  `);

  // Créer des index pour améliorer les performances
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sites_hash ON sites(hash);
    CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);
    CREATE INDEX IF NOT EXISTS idx_site_content_site_id ON site_content(site_id);
  `);

  console.log('Base de données initialisée avec succès');
}

// Initialiser la base de données AVANT de créer les requêtes préparées
initializeDatabase();

// Fonctions pour les utilisateurs
const userQueries = {
  create: db.prepare(`
    INSERT INTO users (username, email, password_hash)
    VALUES (?, ?, ?)
  `),
  
  findByEmail: db.prepare(`
    SELECT * FROM users WHERE email = ?
  `),
  
  findByUsername: db.prepare(`
    SELECT * FROM users WHERE username = ?
  `),
  
  findById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `)
};

// Fonctions pour les sites
const siteQueries = {
  create: db.prepare(`
    INSERT INTO sites (hash, user_id)
    VALUES (?, ?)
  `),
  
  findByHash: db.prepare(`
    SELECT * FROM sites WHERE hash = ?
  `),
  
  findByUserId: db.prepare(`
    SELECT * FROM sites WHERE user_id = ?
  `),
  
  findByHashAndUserId: db.prepare(`
    SELECT * FROM sites WHERE hash = ? AND user_id = ?
  `),
  
  updateTimestamp: db.prepare(`
    UPDATE sites SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),
  
  updatePublicPassword: db.prepare(`
    UPDATE sites 
    SET public_password_enabled = ?, 
        public_password_hash = ?,
        public_password = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
};

// Fonctions pour le contenu des sites
const contentQueries = {
  create: db.prepare(`
    INSERT INTO site_content (
      site_id, type, value, title, backgroundColor,
      backgroundImage, cardBackgroundColor, favicon
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  findBySiteId: db.prepare(`
    SELECT * FROM site_content WHERE site_id = ?
    ORDER BY updated_at DESC
    LIMIT 1
  `),
  
  update: db.prepare(`
    UPDATE site_content SET
      type = ?,
      value = ?,
      title = ?,
      backgroundColor = ?,
      backgroundImage = ?,
      cardBackgroundColor = ?,
      favicon = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE site_id = ?
  `),
  
  upsert: db.transaction((siteId, content) => {
    const existing = contentQueries.findBySiteId.get(siteId);
    
    if (existing) {
      // Mettre à jour
      contentQueries.update.run(
        content.type || existing.type,
        content.value || existing.value,
        content.title || existing.title,
        content.backgroundColor || existing.backgroundColor,
        content.backgroundImage || existing.backgroundImage,
        content.cardBackgroundColor || existing.cardBackgroundColor,
        content.favicon || existing.favicon,
        siteId
      );
    } else {
      // Créer
      contentQueries.create.run(
        siteId,
        content.type || 'text',
        content.value || null,
        content.title || null,
        content.backgroundColor || null,
        content.backgroundImage || null,
        content.cardBackgroundColor || null,
        content.favicon || null
      );
    }
    
    // Mettre à jour le timestamp du site
    siteQueries.updateTimestamp.run(siteId);
  })
};

module.exports = {
  db,
  userQueries,
  siteQueries,
  contentQueries
};

