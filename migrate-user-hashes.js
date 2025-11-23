const { db, userQueries } = require('./database');
const { generateUniqueUserHash } = require('./utils/hash');

/**
 * Script de migration pour ajouter des hash aux utilisateurs existants
 * qui n'en ont pas encore
 */
function migrateUserHashes() {
  console.log('Début de la migration des hash utilisateurs...');
  
  // Récupérer tous les utilisateurs sans hash
  const usersWithoutHash = db.prepare(`
    SELECT * FROM users WHERE hash IS NULL OR hash = ''
  `).all();
  
  console.log(`Nombre d'utilisateurs sans hash: ${usersWithoutHash.length}`);
  
  let migrated = 0;
  let errors = 0;
  
  for (const user of usersWithoutHash) {
    try {
      // Générer un hash unique
      const userHash = generateUniqueUserHash();
      
      // Mettre à jour l'utilisateur
      userQueries.updateHash.run(userHash, user.id);
      
      console.log(`✓ Utilisateur ${user.id} (${user.username}) : hash ${userHash} ajouté`);
      migrated++;
    } catch (error) {
      console.error(`✗ Erreur pour l'utilisateur ${user.id} (${user.username}):`, error.message);
      errors++;
    }
  }
  
  console.log(`\nMigration terminée:`);
  console.log(`  - Utilisateurs migrés: ${migrated}`);
  console.log(`  - Erreurs: ${errors}`);
}

// Exécuter la migration
if (require.main === module) {
  migrateUserHashes();
  process.exit(0);
}

module.exports = { migrateUserHashes };

