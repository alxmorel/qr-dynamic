/**
 * Migration 004 - Ajouter les colonnes de mot de passe public aux sites
 */

module.exports = {
  up: (db) => {
    // Ajouter public_password_enabled
    try {
      db.exec(`
        ALTER TABLE sites ADD COLUMN public_password_enabled INTEGER DEFAULT 0;
      `);
    } catch (e) {
      if (!e.message.includes('duplicate column')) {
        throw e;
      }
    }

    // Ajouter public_password_hash
    try {
      db.exec(`
        ALTER TABLE sites ADD COLUMN public_password_hash TEXT;
      `);
    } catch (e) {
      if (!e.message.includes('duplicate column')) {
        throw e;
      }
    }

    // Ajouter public_password (pour affichage dans l'admin)
    try {
      db.exec(`
        ALTER TABLE sites ADD COLUMN public_password TEXT;
      `);
    } catch (e) {
      if (!e.message.includes('duplicate column')) {
        throw e;
      }
    }
  }
};

