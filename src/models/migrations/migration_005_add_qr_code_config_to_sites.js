/**
 * Migration 005 - Ajouter la colonne qr_code_config aux sites
 */

module.exports = {
  up: (db) => {
    // Ajouter qr_code_config
    try {
      db.exec(`
        ALTER TABLE sites ADD COLUMN qr_code_config TEXT;
      `);
    } catch (e) {
      // La colonne existe déjà, ignorer l'erreur
      if (!e.message.includes('duplicate column')) {
        throw e;
      }
    }
  }
};

