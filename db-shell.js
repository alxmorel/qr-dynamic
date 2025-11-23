const Database = require('better-sqlite3');
const readline = require('readline');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'SQLite> '
});

console.log('SQLite Shell (better-sqlite3)');
console.log('Tapez ".help" pour l\'aide, ".quit" pour quitter\n');

rl.prompt();

rl.on('line', (line) => {
  const input = line.trim();
  
  if (input === '.quit' || input === '.exit') {
    db.close();
    rl.close();
    return;
  }
  
  if (input === '.help') {
    console.log(`
Commandes disponibles:
  .tables          - Liste toutes les tables
  .schema [table]   - Affiche le schéma d'une table
  .quit / .exit    - Quitter
  [SQL query]      - Exécuter une requête SQL
    `);
    rl.prompt();
    return;
  }
  
  if (input === '.tables') {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    tables.forEach(t => console.log(`  ${t.name}`));
    rl.prompt();
    return;
  }
  
  if (input.startsWith('.schema')) {
    const table = input.split(' ')[1];
    if (table) {
      const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE name = ?`).get(table);
      console.log(schema ? schema.sql : 'Table non trouvée');
    } else {
      const schemas = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table'`).all();
      schemas.forEach(s => console.log(s.sql));
    }
    rl.prompt();
    return;
  }
  
  if (input === '') {
    rl.prompt();
    return;
  }
  
  try {
    const stmt = db.prepare(input);
    if (input.trim().toUpperCase().startsWith('SELECT')) {
      const rows = stmt.all();
      if (rows.length === 0) {
        console.log('Aucun résultat');
      } else {
        console.table(rows);
      }
    } else {
      const result = stmt.run();
      console.log(`✓ ${result.changes} ligne(s) affectée(s)`);
    }
  } catch (e) {
    console.error('Erreur:', e.message);
  }
  
  rl.prompt();
});

rl.on('close', () => {
  console.log('\nAu revoir!');
  process.exit(0);
});