import type { HttpContext } from '@adonisjs/core/http'
import Site from '#models/site'
import SiteContent from '#models/site_content'
import SiteAdmin from '#models/site_admin'
import User from '#models/user'
import { generateUniqueSiteHash, generateUniqueUserHash } from '#services/hash_service'
import { hashPassword } from '#services/password_service'
import { ensureUserHash } from '#middleware/auth_middleware'
import { renderView } from '#utils/view_helper.js'
import fs from 'fs'
import path from 'path'

/**
 * Normalise les chemins d'URL (remplace les backslashes par des slashes)
 */
function normalizePath(pathStr: string | null): string | null {
  if (pathStr && pathStr.startsWith('/uploads/')) {
    return pathStr.replace(/\\/g, '/')
  }
  return pathStr
}

export default class AdminController {
  /**
   * Route de compatibilité pour les anciennes URLs /admin/:hash
   * Redirige vers la nouvelle structure /admin/:hashUser/sites/:hashSite
   */
  async redirectOldUrl({ params, response, session }: HttpContext) {
    const hash = params.hash
    const site = await Site.findBy('hash', hash)

    if (!site) {
      return response.status(404).send('Site introuvable')
    }

    const user = await User.find(site.userId)
    if (!user) {
      return response.status(404).send('Utilisateur introuvable')
    }

    // S'assurer que l'utilisateur a un hash
    await ensureUserHash(user)

    return response.redirect(`/admin/${user.hash}/sites/${site.hash}`)
  }

  /**
   * Liste des sites d'un utilisateur (protégée)
   */
  async listSites({ params, response, session }: HttpContext) {
    const hashUser = params.hashUser
    const user = await User.findBy('hash', hashUser)

    if (!user) {
      return response.status(404).send('Utilisateur introuvable')
    }

    const userId = session.get('user_id')
    if (user.id !== userId) {
      return response.status(403).send('Accès interdit')
    }

    // Récupérer tous les sites où l'utilisateur est administrateur (propriétaire ou invité)
    // Sites dont l'utilisateur est propriétaire
    const ownedSites = await Site.query().where('user_id', user.id).exec()

    // Sites où l'utilisateur est administrateur invité
    const adminSites = await SiteAdmin.query()
      .where('user_id', user.id)
      .preload('site')
      .exec()

    // Combiner et enrichir avec le titre
    const allSites = []

    for (const site of ownedSites) {
      const content = await SiteContent.findBy('siteId', site.id)
      allSites.push({
        ...site.serialize(),
        title: content ? content.title : null,
        isOwner: true,
      })
    }

    for (const adminSite of adminSites) {
      if (adminSite.site) {
        const content = await SiteContent.findBy('siteId', adminSite.site.id)
        allSites.push({
          ...adminSite.site.serialize(),
          title: content ? content.title : null,
          isOwner: false,
        })
      }
    }

    return renderView(response, 'sites-list', {
      sites: allSites,
      userHash: hashUser,
      success: params.success || null,
      error: params.error || null,
      content: null,
    })
  }

  /**
   * Créer un nouveau site (protégée)
   */
  async createSite({ params, response, session }: HttpContext) {
    try {
      const hashUser = params.hashUser
      const user = await User.findBy('hash', hashUser)

      if (!user) {
        return response.status(404).json({ error: 'Utilisateur introuvable' })
      }

      const userId = session.get('user_id')
      if (user.id !== userId) {
        return response.status(403).json({ error: 'Accès interdit' })
      }

      // Générer un hash unique pour le site
      const siteHash = await generateUniqueSiteHash()

      // Créer le site
      const site = new Site()
      site.hash = siteHash
      site.userId = user.id
      site.publicPasswordEnabled = false
      await site.save()

      return response.json({
        success: true,
        siteHash: siteHash,
        siteId: site.id,
      })
    } catch (error) {
      console.error('Erreur lors de la création du site:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la création du site',
      })
    }
  }

  /**
   * Supprimer un site (protégée)
   */
  async deleteSite({ params, response, session }: HttpContext) {
    try {
      const hashSite = params.hashSite
      const site = await Site.findBy('hash', hashSite)

      if (!site) {
        return response.status(404).json({ error: 'Site introuvable' })
      }

      const userId = session.get('user_id')
      if (site.userId !== userId) {
        return response.status(403).json({ error: 'Accès interdit' })
      }

      // Supprimer les fichiers uploadés associés au site
      const uploadDir = path.join('./uploads', String(userId), site.hash)
      if (fs.existsSync(uploadDir)) {
        fs.rmSync(uploadDir, { recursive: true, force: true })
      }

      // Supprimer le site (et son contenu via CASCADE)
      await site.delete()

      return response.json({
        success: true,
      })
    } catch (error) {
      console.error('Erreur lors de la suppression du site:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression du site',
      })
    }
  }

  /**
   * Page admin pour un site spécifique (protégée)
   */
  async showSite({ params, response, session, request }: HttpContext) {
    const hashSite = params.hashSite
    const site = await Site.findBy('hash', hashSite)

    if (!site) {
      return response.status(404).send('Site introuvable')
    }

    const content = await SiteContent.findBy('siteId', site.id)

    // Initialiser avec des valeurs par défaut si pas de contenu
    const defaultContent = {
      type: 'text',
      value: '',
      title: 'Mon site',
      backgroundColor: '#faf6ff',
      backgroundImage: null,
      cardBackgroundColor: '#ffffff',
      favicon: null,
    }

    const displayContent = content || defaultContent

    // Normaliser les chemins d'URL
    if (displayContent.backgroundImage) {
      displayContent.backgroundImage = normalizePath(displayContent.backgroundImage)
    }
    if (displayContent.favicon) {
      displayContent.favicon = normalizePath(displayContent.favicon)
    }
    if (displayContent.value) {
      displayContent.value = normalizePath(displayContent.value)
    }

    // Construire l'URL complète du site public
    const protocol = request.header('x-forwarded-proto') || 'http'
    const host = request.header('host') || 'localhost:3000'
    const publicUrl = `${protocol}://${host}/${site.hash}`

    const userId = session.get('user_id')
    const isOwner = site.userId === userId

    return renderView(response, 'admin', {
      content: displayContent,
      site: site.serialize(),
      userHash: params.hashUser,
      success: params.success || null,
      publicPasswordEnabled: site.publicPasswordEnabled ? true : false,
      publicPassword: site.publicPassword || null,
      publicUrl: publicUrl,
      isOwner: isOwner,
    })
  }

  /**
   * Mise à jour du contenu d'un site (protégée)
   * Note: Les uploads de fichiers seront gérés via un middleware multer séparé
   */
  async updateSite({ params, request, response, session }: HttpContext) {
    try {
      const hashSite = params.hashSite
      const site = await Site.findBy('hash', hashSite)

      if (!site) {
        return response.status(404).json({ error: 'Site introuvable' })
      }

      const userId = session.get('user_id')
      if (site.userId !== userId) {
        // Vérifier si l'utilisateur est administrateur invité
        const adminCheck = await SiteAdmin.query()
          .where('site_id', site.id)
          .where('user_id', userId)
          .first()

        if (!adminCheck) {
          return response.status(403).json({ error: 'Accès interdit' })
        }
      }

      const existingContent = await SiteContent.findBy('siteId', site.id)

      // Gérer le mot de passe public
      const publicPasswordEnabled =
        request.input('publicPasswordEnabled') === 'on' ||
        request.input('publicPasswordEnabled') === 'true'
      let publicPasswordHash = site.publicPasswordHash || null
      let publicPasswordPlain = site.publicPassword || null

      if (publicPasswordEnabled) {
        const publicPassword = request.input('publicPassword')
        if (publicPassword && publicPassword.trim() !== '') {
          // Hasher le nouveau mot de passe
          publicPasswordHash = await hashPassword(publicPassword)
          // Stocker aussi le mot de passe en clair pour l'affichage dans l'admin
          publicPasswordPlain = publicPassword
        }
      } else {
        // Désactiver la protection
        publicPasswordHash = null
        publicPasswordPlain = null
      }

      // Mettre à jour le mot de passe public
      site.publicPasswordEnabled = publicPasswordEnabled
      site.publicPasswordHash = publicPasswordHash
      site.publicPassword = publicPasswordPlain
      await site.save()

      // Préparer le nouveau contenu
      const newContent = {
        type: request.input('type') || existingContent?.type || 'text',
        value: request.input('value') || existingContent?.value || '',
        title: request.input('title') || existingContent?.title || 'Mon site',
        backgroundColor:
          request.input('backgroundColor') ||
          existingContent?.backgroundColor ||
          '#faf6ff',
        backgroundImage: existingContent?.backgroundImage || null,
        cardBackgroundColor:
          request.input('cardBackgroundColorValue') ||
          request.input('cardBackgroundColor') ||
          existingContent?.cardBackgroundColor ||
          '#ffffff',
        favicon: existingContent?.favicon || null,
      }

      // Note: La gestion des uploads de fichiers sera faite via un middleware multer
      // Pour l'instant, on garde les valeurs existantes

      // Sauvegarder dans la base de données
      if (existingContent) {
        existingContent.type = newContent.type
        existingContent.value = newContent.value
        existingContent.title = newContent.title
        existingContent.backgroundColor = newContent.backgroundColor
        existingContent.cardBackgroundColor = newContent.cardBackgroundColor
        await existingContent.save()
      } else {
        const content = new SiteContent()
        content.siteId = site.id
        content.type = newContent.type
        content.value = newContent.value
        content.title = newContent.title
        content.backgroundColor = newContent.backgroundColor
        content.cardBackgroundColor = newContent.cardBackgroundColor
        await content.save()
      }

      const user = await User.find(site.userId)
      return response.redirect(`/admin/${user?.hash}/sites/${site.hash}?success=true`)
    } catch (error) {
      console.error('Erreur lors de la mise à jour du site:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour du site',
      })
    }
  }
}
