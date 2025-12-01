import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Site from '#models/site'
import SiteContent from '#models/site_content'
import { generateUniqueUserHash, generateUniqueSiteHash } from '#app/services/hash_service.js'
import { hashPassword } from '#app/services/password_service.js'

export default class extends BaseSeeder {
  async run() {
    // Créer un utilisateur de test
    const testUserHash = await generateUniqueUserHash()
    const testPasswordHash = await hashPassword('password123')

    const testUser = await User.create({
      hash: testUserHash,
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: testPasswordHash,
      googleId: null,
    })

    console.log(`✅ Utilisateur de test créé: ${testUser.email}`)

    // Créer un site de test pour cet utilisateur
    const testSiteHash = await generateUniqueSiteHash()

    const testSite = await Site.create({
      hash: testSiteHash,
      userId: testUser.id,
      publicPasswordEnabled: false,
      publicPasswordHash: null,
      publicPassword: null,
    })

    console.log(`✅ Site de test créé: ${testSite.hash}`)

    // Créer un contenu de test pour le site
    const testContent = await SiteContent.create({
      siteId: testSite.id,
      type: 'text',
      value: 'Bienvenue sur mon site QR Dynamic !',
      title: 'Mon site de test',
      backgroundColor: '#faf6ff',
      backgroundImage: null,
      cardBackgroundColor: '#ffffff',
      favicon: null,
    })

    console.log(`✅ Contenu de test créé pour le site`)

    // Créer un deuxième utilisateur avec un site protégé par mot de passe
    const testUser2Hash = await generateUniqueUserHash()
    const testPassword2Hash = await hashPassword('password123')

    const testUser2 = await User.create({
      hash: testUser2Hash,
      username: 'testuser2',
      email: 'test2@example.com',
      passwordHash: testPassword2Hash,
      googleId: null,
    })

    console.log(`✅ Deuxième utilisateur de test créé: ${testUser2.email}`)

    const testSite2Hash = await generateUniqueSiteHash()
    const publicPasswordHash = await hashPassword('public123')

    const testSite2 = await Site.create({
      hash: testSite2Hash,
      userId: testUser2.id,
      publicPasswordEnabled: true,
      publicPasswordHash: publicPasswordHash,
      publicPassword: 'public123',
    })

    console.log(`✅ Site protégé par mot de passe créé: ${testSite2.hash}`)

    const testContent2 = await SiteContent.create({
      siteId: testSite2.id,
      type: 'text',
      value: 'Ce site est protégé par un mot de passe. Le mot de passe est: public123',
      title: 'Site protégé',
      backgroundColor: '#fff5f5',
      backgroundImage: null,
      cardBackgroundColor: '#ffffff',
      favicon: null,
    })

    console.log(`✅ Contenu de test créé pour le site protégé`)

    console.log('\n📊 Résumé des données créées:')
    console.log(`   - Utilisateurs: 2`)
    console.log(`   - Sites: 2`)
    console.log(`   - Contenus: 2`)
    console.log('\n🔑 Identifiants de test:')
    console.log(`   Utilisateur 1: test@example.com / password123`)
    console.log(`   Utilisateur 2: test2@example.com / password123`)
    console.log(`   Site protégé: ${testSite2.hash} / public123`)
  }
}
