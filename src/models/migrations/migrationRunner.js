/**
 * Système de gestion des migrations de base de données
 * Permet d'appliquer les migrations de manière versionnée et traçable
 */

const db = require('../database');
const fs = require('fs');
const path = require('path');

/**
 * Initialise la table de suivi des migrations
 */
function initializeMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(name);
  `);
}

/**
 * Vérifie si une migration a déjà été appliquée
 * @param {string} migrationName - Nom de la migration
 * @returns {boolean} True si la migration a été appliquée
 */
function isMigrationApplied(migrationName) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM migrations WHERE name = ?');
  const result = stmt.get(migrationName);
  return result.count > 0;
}

/**
 * Marque une migration comme appliquée
 * @param {string} migrationName - Nom de la migration
 */
function markMigrationAsApplied(migrationName) {
  const stmt = db.prepare('INSERT INTO migrations (name) VALUES (?)');
  stmt.run(migrationName);
}

/**
 * Exécute une migration de manière sécurisée
 * @param {string} migrationName - Nom de la migration
 * @param {Function} migrationFunction - Fonction de migration à exécuter
 */
function runMigration(migrationName, migrationFunction) {
  if (isMigrationApplied(migrationName)) {
    console.log(`✓ Migration ${migrationName} déjà appliquée, ignorée`);
    return;
  }

  console.log(`→ Application de la migration ${migrationName}...`);
  
  try {
    // Exécuter la migration dans une transaction
    db.transaction(() => {
      migrationFunction(db);
      markMigrationAsApplied(migrationName);
    })();
    
    console.log(`✓ Migration ${migrationName} appliquée avec succès`);
  } catch (error) {
    console.error(`✗ Erreur lors de l'application de la migration ${migrationName}:`, error);
    throw error;
  }
}

/**
 * Charge et exécute toutes les migrations dans l'ordre
 */
function runAllMigrations() {
  initializeMigrationsTable();
  
  const migrationsDir = __dirname;
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.startsWith('migration_') && file.endsWith('.js'))
    .sort(); // Trier pour garantir l'ordre d'exécution
  
  console.log(`\n📦 Exécution de ${migrationFiles.length} migration(s)...\n`);
  
  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file);
    const migration = require(migrationPath);
    
    if (typeof migration.up !== 'function') {
      console.warn(`⚠ Migration ${file} n'a pas de fonction 'up', ignorée`);
      continue;
    }
    
    runMigration(file, migration.up);
  }
  
  console.log(`\n✅ Toutes les migrations ont été appliquées\n`);
}

module.exports = {
  runMigration,
  runAllMigrations,
  isMigrationApplied
};

