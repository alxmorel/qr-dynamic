/**
 * Script de migration pour convertir content.json en base de données
 * Ce script crée un utilisateur admin par défaut et migre le contenu existant
 */

const { userQueries, siteQueries, contentQueries } = require('./database');
const { createUserWithSite } = require('./utils/auth');
const fs = require('fs');
const path = require('path');

async function migrate() {
  console.log('🚀 Démarrage de la migration...\n');
  
  try {
    // Vérifier si content.json existe
    const contentPath = path.join(__dirname, 'content.json');
    if (!fs.existsSync(contentPath)) {
      console.log('⚠️  Aucun fichier content.json trouvé. Migration non nécessaire.');
      return;
    }
    
    // Lire le contenu existant
    const oldContent = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
    console.log('📄 Contenu existant trouvé:', oldContent);
    
    // Vérifier si un utilisateur admin existe déjà
    let adminUser = userQueries.findByEmail.get('admin@qr-dynamic.local');
    
    if (!adminUser) {
      console.log('👤 Création de l\'utilisateur admin...');
      // Créer un utilisateur admin par défaut
      const { user, site } = await createUserWithSite(
        'admin',
        'admin@qr-dynamic.local',
        'admin123' // Mot de passe par défaut - À CHANGER !
      );
      adminUser = user;
      console.log(`✅ Utilisateur admin créé (ID: ${user.id})`);
      console.log(`✅ Site créé avec hash: ${site.hash}`);
      console.log('⚠️  ATTENTION: Le mot de passe par défaut est "admin123". Changez-le immédiatement !\n');
    } else {
      console.log('👤 Utilisateur admin existe déjà');
      // Récupérer le premier site de l'admin
      const sites = siteQueries.findByUserId.all(adminUser.id);
      if (sites.length === 0) {
        console.log('❌ Aucun site trouvé pour l\'utilisateur admin. Création d\'un nouveau site...');
        const { generateUniqueHash } = require('./utils/hash');
        const siteHash = generateUniqueHash();
        const siteResult = siteQueries.create.run(siteHash, adminUser.id);
        console.log(`✅ Site créé avec hash: ${siteHash}`);
      }
    }
    
    // Récupérer le premier site de l'admin
    const sites = siteQueries.findByUserId.all(adminUser.id);
    if (sites.length === 0) {
      throw new Error('Aucun site disponible pour la migration');
    }
    
    const site = sites[0];
    console.log(`📦 Migration du contenu vers le site ${site.hash}...`);
    
    // Vérifier si le contenu existe déjà
    const existingContent = contentQueries.findBySiteId.get(site.id);
    
    if (existingContent) {
      console.log('⚠️  Un contenu existe déjà pour ce site. Voulez-vous le remplacer ?');
      console.log('   Pour forcer la migration, supprimez d\'abord le contenu existant dans la base de données.');
      return;
    }
    
    // Préparer le contenu pour la migration
    const newContent = {
      type: oldContent.type || 'text',
      value: oldContent.value || '',
      title: oldContent.title || 'Mon site',
      backgroundColor: oldContent.backgroundColor || '#faf6ff',
      backgroundImage: oldContent.backgroundImage || null,
      cardBackgroundColor: oldContent.cardBackgroundColor || '#ffffff',
      favicon: oldContent.favicon || null
    };
    
    // Migrer les fichiers uploadés si nécessaire
    // Les fichiers dans /uploads doivent être déplacés vers /uploads/user_id/hash/
    if (newContent.backgroundImage && newContent.backgroundImage.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, newContent.backgroundImage);
      if (fs.existsSync(oldPath)) {
        const newDir = path.join(__dirname, 'uploads', String(adminUser.id), site.hash);
        if (!fs.existsSync(newDir)) {
          fs.mkdirSync(newDir, { recursive: true });
        }
        const filename = path.basename(newContent.backgroundImage);
        const newPath = path.join(newDir, filename);
        fs.copyFileSync(oldPath, newPath);
        newContent.backgroundImage = `/uploads/${adminUser.id}/${site.hash}/${filename}`;
        console.log(`📁 Image de fond migrée: ${newContent.backgroundImage}`);
      }
    }
    
    if (newContent.favicon && newContent.favicon.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, newContent.favicon);
      if (fs.existsSync(oldPath)) {
        const newDir = path.join(__dirname, 'uploads', String(adminUser.id), site.hash);
        if (!fs.existsSync(newDir)) {
          fs.mkdirSync(newDir, { recursive: true });
        }
        const filename = path.basename(newContent.favicon);
        const newPath = path.join(newDir, filename);
        fs.copyFileSync(oldPath, newPath);
        newContent.favicon = `/uploads/${adminUser.id}/${site.hash}/${filename}`;
        console.log(`📁 Favicon migré: ${newContent.favicon}`);
      }
    }
    
    // Insérer le contenu dans la base de données
    contentQueries.upsert(site.id, newContent);
    
    console.log('✅ Migration terminée avec succès !\n');
    console.log(`📋 Informations de connexion:`);
    console.log(`   Email: admin@qr-dynamic.local`);
    console.log(`   Mot de passe: admin123`);
    console.log(`   Hash du site: ${site.hash}`);
    console.log(`   URL publique: http://localhost:3000/${site.hash}`);
    console.log(`   URL admin: http://localhost:3000/admin/${site.hash}\n`);
    console.log('⚠️  IMPORTANT: Changez le mot de passe admin après la première connexion !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

// Exécuter la migration
if (require.main === module) {
  migrate().then(() => {
    console.log('✨ Migration terminée');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { migrate };

