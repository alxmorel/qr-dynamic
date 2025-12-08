/**
 * Migration 002 - Ajouter la colonne hash aux utilisateurs
 */

module.exports = {
  up: (db) => {
    // Ajouter la colonne hash si elle n'existe pas
    try {
      db.exec(`
        ALTER TABLE users ADD COLUMN hash TEXT;
      `);
    } catch (e) {
      // La colonne existe déjà, ignorer l'erreur
      if (!e.message.includes('duplicate column')) {
        throw e;
      }
    }

    // Créer un index unique sur la colonne hash
    try {
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_hash_unique ON users(hash);
      `);
    } catch (e) {
      // L'index existe déjà, ignorer
    }

    // Créer un index non-unique pour les recherches
    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_hash ON users(hash);
      `);
    } catch (e) {
      // L'index existe déjà, ignorer
    }
  }
};

