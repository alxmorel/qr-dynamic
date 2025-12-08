/**
 * Migration 003 - Ajouter la colonne google_id aux utilisateurs
 */

module.exports = {
  up: (db) => {
    // Ajouter la colonne google_id si elle n'existe pas
    try {
      db.exec(`
        ALTER TABLE users ADD COLUMN google_id TEXT;
      `);
    } catch (e) {
      // La colonne existe déjà, ignorer l'erreur
      if (!e.message.includes('duplicate column')) {
        throw e;
      }
    }

    // Créer un index unique sur google_id (où il n'est pas NULL)
    try {
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
      `);
    } catch (e) {
      // L'index existe déjà, ignorer
    }
  }
};

