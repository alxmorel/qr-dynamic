/**
 * Migration 001 - Schéma initial de la base de données
 * Crée toutes les tables de base sans les colonnes ajoutées ultérieurement
 */

module.exports = {
  up: (db) => {
    // Table users (sans hash et google_id, ajoutés dans les migrations suivantes)
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table sites (sans les colonnes ajoutées ultérieurement)
    db.exec(`
      CREATE TABLE IF NOT EXISTS sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

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

    // Table site_admins
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

    // Table pending_registrations
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

    // Table content_templates
    db.exec(`
      CREATE TABLE IF NOT EXISTS content_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        value TEXT,
        title TEXT,
        backgroundColor TEXT,
        backgroundImage TEXT,
        cardBackgroundColor TEXT,
        favicon TEXT,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Créer les index de base
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sites_hash ON sites(hash);
      CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);
      CREATE INDEX IF NOT EXISTS idx_site_content_site_id ON site_content(site_id);
      CREATE INDEX IF NOT EXISTS idx_site_invitations_token ON site_invitations(token);
      CREATE INDEX IF NOT EXISTS idx_site_invitations_site_id ON site_invitations(site_id);
      CREATE INDEX IF NOT EXISTS idx_site_admins_site_id ON site_admins(site_id);
      CREATE INDEX IF NOT EXISTS idx_site_admins_user_id ON site_admins(user_id);
      CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);
      CREATE INDEX IF NOT EXISTS idx_pending_registrations_username ON pending_registrations(username);
      CREATE INDEX IF NOT EXISTS idx_pending_registrations_token ON pending_registrations(verification_token);
      CREATE INDEX IF NOT EXISTS idx_content_templates_user_id ON content_templates(user_id);
      CREATE INDEX IF NOT EXISTS idx_content_templates_is_default ON content_templates(is_default);
    `);
  }
};

