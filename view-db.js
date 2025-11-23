const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// Activer les colonnes pour un meilleur affichage
db.pragma('foreign_keys = ON');

console.log('\n═══════════════════════════════════════');
console.log('   CONSULTATION DE LA BASE DE DONNÉES');
console.log('═══════════════════════════════════════\n');

// Utilisateurs
console.log('📋 UTILISATEURS:');
console.log('─────────────────────────────────────');
try {
  const users = db.prepare('SELECT * FROM users').all();
  if (users.length === 0) {
    console.log('Aucun utilisateur trouvé\n');
  } else {
    users.forEach(u => {
      console.log(`  ID: ${u.id}`);
      console.log(`  Username: ${u.username}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Créé le: ${u.created_at}`);
      console.log('');
    });
  }
} catch(e) {
  console.log('Erreur:', e.message);
}

// Sites
console.log('\n🌐 SITES:');
console.log('─────────────────────────────────────');
try {
  const sites = db.prepare(`
    SELECT s.*, u.username 
    FROM sites s 
    LEFT JOIN users u ON s.user_id = u.id
  `).all();
  
  if (sites.length === 0) {
    console.log('Aucun site trouvé\n');
  } else {
    sites.forEach(s => {
      console.log(`  ID: ${s.id}`);
      console.log(`  Hash: ${s.hash}`);
      console.log(`  Propriétaire: ${s.username || 'N/A'} (ID: ${s.user_id})`);
      console.log(`  Créé le: ${s.created_at}`);
      console.log(`  Modifié le: ${s.updated_at}`);
      console.log('');
    });
  }
} catch(e) {
  console.log('Erreur:', e.message);
}

// Contenu
console.log('\n📄 CONTENU DES SITES:');
console.log('─────────────────────────────────────');
try {
  const content = db.prepare(`
    SELECT sc.*, s.hash as site_hash, u.username
    FROM site_content sc
    JOIN sites s ON sc.site_id = s.id
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY sc.updated_at DESC
  `).all();
  
  if (content.length === 0) {
    console.log('Aucun contenu trouvé\n');
  } else {
    content.forEach(c => {
      console.log(`  Site: ${c.site_hash} (${c.username || 'N/A'})`);
      console.log(`  Titre: ${c.title || 'N/A'}`);
      console.log(`  Type: ${c.type || 'N/A'}`);
      console.log(`  Valeur: ${c.value ? (c.value.length > 60 ? c.value.substring(0, 60) + '...' : c.value) : 'N/A'}`);
      console.log(`  Couleur fond: ${c.backgroundColor || 'N/A'}`);
      console.log(`  Couleur carte: ${c.cardBackgroundColor || 'N/A'}`);
      console.log(`  Modifié le: ${c.updated_at}`);
      console.log('');
    });
  }
} catch(e) {
  console.log('Erreur:', e.message);
}

// Statistiques
console.log('\n📊 STATISTIQUES:');
console.log('─────────────────────────────────────');
try {
  const stats = {
    users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    sites: db.prepare('SELECT COUNT(*) as count FROM sites').get().count,
    content: db.prepare('SELECT COUNT(*) as count FROM site_content').get().count
  };
  
  console.log(`  Utilisateurs: ${stats.users}`);
  console.log(`  Sites: ${stats.sites}`);
  console.log(`  Contenus: ${stats.content}`);
} catch(e) {
  console.log('Erreur:', e.message);
}

console.log('\n═══════════════════════════════════════\n');

db.close();