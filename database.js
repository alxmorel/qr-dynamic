const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { encrypt, decrypt } = require('./utils/encryption');

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
      hash TEXT UNIQUE,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      google_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Migration : Ajouter la colonne hash si elle n'existe pas
  try {
    db.exec(`
      ALTER TABLE users ADD COLUMN hash TEXT;
    `);
    // Créer un index unique sur la colonne hash après l'avoir ajoutée
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_hash_unique ON users(hash);
    `);
  } catch (e) {
    // La colonne existe déjà, ignorer l'erreur
  }

  // Migration : Ajouter la colonne google_id si elle n'existe pas
  try {
    db.exec(`
      ALTER TABLE users ADD COLUMN google_id TEXT;
    `);
  } catch (e) {
    // La colonne existe déjà, ignorer l'erreur
  }

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

  // Migration : Ajouter la colonne qr_code_config si elle n'existe pas
  try {
    db.exec(`
      ALTER TABLE sites ADD COLUMN qr_code_config TEXT;
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

  // Table site_invitations
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      used_by INTEGER,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Table site_admins (relation many-to-many entre users et sites)
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(site_id, user_id)
    )
  `);

  // Créer des index pour améliorer les performances
  // Note: idx_users_hash_unique est créé dans la migration ci-dessus
  // Créer l'index non-unique seulement si la colonne existe
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_hash ON users(hash);
    `);
  } catch (e) {
    // La colonne n'existe peut-être pas encore, ignorer
  }
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_sites_hash ON sites(hash);
    CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);
    CREATE INDEX IF NOT EXISTS idx_site_content_site_id ON site_content(site_id);
    CREATE INDEX IF NOT EXISTS idx_site_invitations_token ON site_invitations(token);
    CREATE INDEX IF NOT EXISTS idx_site_invitations_site_id ON site_invitations(site_id);
    CREATE INDEX IF NOT EXISTS idx_site_admins_site_id ON site_admins(site_id);
    CREATE INDEX IF NOT EXISTS idx_site_admins_user_id ON site_admins(user_id);
  `);

  // Table pending_registrations pour stocker les inscriptions en attente de vérification email
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      invite_token TEXT,
      verification_token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);
    CREATE INDEX IF NOT EXISTS idx_pending_registrations_username ON pending_registrations(username);
    CREATE INDEX IF NOT EXISTS idx_pending_registrations_token ON pending_registrations(verification_token);
  `);

  console.log('Base de données initialisée avec succès');
}

// Initialiser la base de données AVANT de créer les requêtes préparées
initializeDatabase();

// Fonctions pour les utilisateurs
const userQueries = {
  create: db.prepare(`
    INSERT INTO users (hash, username, email, password_hash, google_id)
    VALUES (?, ?, ?, ?, ?)
  `),
  
  findByEmail: db.prepare(`
    SELECT * FROM users WHERE email = ?
  `),
  
  findByUsername: db.prepare(`
    SELECT * FROM users WHERE username = ?
  `),
  
  findByGoogleId: db.prepare(`
    SELECT * FROM users WHERE google_id = ?
  `),

  findById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),
  
  findByHash: db.prepare(`
    SELECT * FROM users WHERE hash = ?
  `),
  
  updateHash: db.prepare(`
    UPDATE users SET hash = ? WHERE id = ?
  `),

  updateGoogleId: db.prepare(`
    UPDATE users SET google_id = ? WHERE id = ?
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
  
  findById: db.prepare(`
    SELECT * FROM sites WHERE id = ?
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
  `),
  
  updateQrCodeConfig: db.prepare(`
    UPDATE sites 
    SET qr_code_config = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  
  delete: db.prepare(`
    DELETE FROM sites WHERE id = ? AND user_id = ?
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
  
  findBySiteIdRaw: db.prepare(`
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
  
  // Wrapper pour findBySiteId qui déchiffre automatiquement
  findBySiteId: {
    get: (siteId) => {
      const result = contentQueries.findBySiteIdRaw.get(siteId);
      if (!result) {
        return null;
      }
      // Déchiffrer les champs sensibles
      return {
        ...result,
        value: result.value ? decrypt(result.value) : null,
        title: result.title ? decrypt(result.title) : null,
        backgroundImage: result.backgroundImage ? decrypt(result.backgroundImage) : null,
        favicon: result.favicon ? decrypt(result.favicon) : null
      };
    }
  },
  
  upsert: db.transaction((siteId, content) => {
    const existing = contentQueries.findBySiteIdRaw.get(siteId);
    
    // Préparer les valeurs en chiffrant les champs sensibles
    // Si la valeur est fournie (même null ou ""), la chiffrer
    // Sinon, utiliser la valeur existante (déjà chiffrée)
    const encryptedValue = content.hasOwnProperty('value') ? encrypt(content.value) : (existing?.value || null);
    const encryptedTitle = content.hasOwnProperty('title') ? encrypt(content.title) : (existing?.title || null);
    const encryptedBackgroundImage = content.hasOwnProperty('backgroundImage') ? encrypt(content.backgroundImage) : (existing?.backgroundImage || null);
    const encryptedFavicon = content.hasOwnProperty('favicon') ? encrypt(content.favicon) : (existing?.favicon || null);
    
    if (existing) {
      // Mettre à jour
      contentQueries.update.run(
        content.type !== undefined ? content.type : existing.type,
        encryptedValue,
        encryptedTitle,
        content.backgroundColor !== undefined ? content.backgroundColor : existing.backgroundColor,
        encryptedBackgroundImage,
        content.cardBackgroundColor !== undefined ? content.cardBackgroundColor : existing.cardBackgroundColor,
        encryptedFavicon,
        siteId
      );
    } else {
      // Créer
      contentQueries.create.run(
        siteId,
        content.type || 'text',
        encryptedValue,
        encryptedTitle,
        content.backgroundColor || null,
        encryptedBackgroundImage,
        content.cardBackgroundColor || null,
        encryptedFavicon
      );
    }
    
    // Mettre à jour le timestamp du site
    siteQueries.updateTimestamp.run(siteId);
  })
};

// Fonctions pour les invitations
const invitationQueries = {
  create: db.prepare(`
    INSERT INTO site_invitations (site_id, created_by, token, expires_at)
    VALUES (?, ?, ?, ?)
  `),
  
  findByToken: db.prepare(`
    SELECT * FROM site_invitations WHERE token = ?
  `),
  
  findBySiteId: db.prepare(`
    SELECT * FROM site_invitations 
    WHERE site_id = ? 
    ORDER BY created_at DESC
  `),
  
  // Récupérer uniquement les invitations actives (non utilisées et non expirées)
  findActiveBySiteId: db.prepare(`
    SELECT * FROM site_invitations 
    WHERE site_id = ? 
    AND used = 0
    AND expires_at > datetime('now')
    ORDER BY created_at DESC
  `),
  
  markAsUsed: db.prepare(`
    UPDATE site_invitations 
    SET used = 1, used_by = ?, used_at = CURRENT_TIMESTAMP
    WHERE token = ? AND used = 0
  `),
  
  delete: db.prepare(`
    DELETE FROM site_invitations WHERE id = ? AND created_by = ?
  `)
};

// Fonctions pour les administrateurs de sites
const siteAdminQueries = {
  create: db.prepare(`
    INSERT OR IGNORE INTO site_admins (site_id, user_id)
    VALUES (?, ?)
  `),
  
  findBySiteId: db.prepare(`
    SELECT u.* FROM site_admins sa
    JOIN users u ON sa.user_id = u.id
    WHERE sa.site_id = ?
  `),
  
  findBySiteIdAndUserId: db.prepare(`
    SELECT * FROM site_admins WHERE site_id = ? AND user_id = ?
  `),
  
  isAdmin: db.prepare(`
    SELECT COUNT(*) as count FROM site_admins 
    WHERE site_id = ? AND user_id = ?
  `),
  
  remove: db.prepare(`
    DELETE FROM site_admins WHERE site_id = ? AND user_id = ?
  `),
  
  // Récupérer tous les sites où un utilisateur est administrateur (propriétaire ou invité)
  findSitesByUserId: db.prepare(`
    SELECT DISTINCT s.* 
    FROM sites s
    LEFT JOIN site_admins sa ON s.id = sa.site_id
    WHERE s.user_id = ? OR sa.user_id = ?
    ORDER BY s.updated_at DESC
  `)
};

// Fonctions pour les inscriptions en attente
const pendingRegistrationQueries = {
  create: db.prepare(`
    INSERT INTO pending_registrations (
      username,
      email,
      password_hash,
      invite_token,
      verification_token,
      expires_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `),

  findByToken: db.prepare(`
    SELECT * FROM pending_registrations WHERE verification_token = ?
  `),

  findByEmail: db.prepare(`
    SELECT * FROM pending_registrations WHERE email = ?
  `),

  findByUsername: db.prepare(`
    SELECT * FROM pending_registrations WHERE username = ?
  `),

  deleteById: db.prepare(`
    DELETE FROM pending_registrations WHERE id = ?
  `),

  deleteExpired: db.prepare(`
    DELETE FROM pending_registrations WHERE expires_at < datetime('now')
  `)
};

module.exports = {
  db,
  userQueries,
  siteQueries,
  contentQueries,
  invitationQueries,
  siteAdminQueries,
  pendingRegistrationQueries
};

