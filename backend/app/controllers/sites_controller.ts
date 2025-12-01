import type { HttpContext } from '@adonisjs/core/http'
import Site from '#models/site'
import SiteContent from '#models/site_content'
import { verifyPassword } from '#services/password_service'
import { renderView } from '#utils/view_helper.js'

/**
 * Normalise les chemins d'URL (remplace les backslashes par des slashes)
 */
function normalizePath(path: string | null): string | null {
  if (path && path.startsWith('/uploads/')) {
    return path.replace(/\\/g, '/')
  }
  return path
}

/**
 * Normalise le contenu d'un site (chemins et URLs)
 */
function normalizeContent(content: SiteContent | null): SiteContent | null {
  if (!content) return content

  if (content.backgroundImage) {
    content.backgroundImage = normalizePath(content.backgroundImage)
  }
  if (content.favicon) {
    content.favicon = normalizePath(content.favicon)
  }
  if (content.value) {
    content.value = normalizePath(content.value)
  }

  // Note: Les conversions YouTube/Spotify seront gérées côté frontend
  return content
}

export default class SitesController {
  /**
   * Route POST pour vérifier le mot de passe public
   */
  async verifyPassword({ params, request, response }: HttpContext) {
    const hash = params.hash
    const { password } = request.only(['password'])

    const site = await Site.findBy('hash', hash)
    if (!site) {
      return response.status(404).json({ error: 'Site introuvable' })
    }

    // Vérifier si la protection par mot de passe est activée
    if (!site.publicPasswordEnabled || !site.publicPasswordHash) {
      return response.status(400).json({ error: "Ce site n'est pas protégé par un mot de passe" })
    }

    // Vérifier le mot de passe
    const isValid = await verifyPassword(password, site.publicPasswordHash)

    if (isValid) {
      return response.json({ success: true })
    } else {
      return response.status(401).json({ error: 'Mot de passe incorrect' })
    }
  }

  /**
   * Route pour récupérer le contenu après authentification
   */
  async getContent({ params, response }: HttpContext) {
    const hash = params.hash

    const site = await Site.findBy('hash', hash)
    if (!site) {
      return response.status(404).json({ error: 'Site introuvable' })
    }

    // Charger le contenu du site
    const content = await SiteContent.findBy('siteId', site.id)

    if (!content) {
      return response.json({
        content: {
          type: 'text',
          value: "Ce site n'a pas encore de contenu.",
          title: 'Site vide',
          backgroundColor: '#faf6ff',
          cardBackgroundColor: '#ffffff',
        },
      })
    }

    // Normaliser le contenu
    normalizeContent(content)

    return response.json({ content })
  }

  /**
   * Route pour afficher un site public
   */
  async show({ params, response }: HttpContext) {
    const hash = params.hash

    // Ignorer les routes spéciales
    const reservedRoutes = ['login', 'register', 'logout', 'admin']
    if (reservedRoutes.includes(hash)) {
      return response.status(404).send('Page introuvable')
    }

    const site = await Site.findBy('hash', hash)
    if (!site) {
      return response.status(404).send('Site introuvable')
    }

    // Vérifier si la protection par mot de passe est activée
    const isPasswordProtected = site.publicPasswordEnabled && site.publicPasswordHash

    // Si protégé, toujours afficher la popup
    if (isPasswordProtected) {
      return renderView(response, 'index', {
        content: null,
        requiresPassword: true,
        siteHash: hash,
      })
    }

    // Si non protégé, charger le contenu normalement
    const content = await SiteContent.findBy('siteId', site.id)

    if (!content) {
      // Si pas de contenu, afficher un message par défaut
      return renderView(response, 'index', {
        content: {
          type: 'text',
          value: "Ce site n'a pas encore de contenu.",
          title: 'Site vide',
          backgroundColor: '#faf6ff',
          cardBackgroundColor: '#ffffff',
        },
        requiresPassword: false,
      })
    }

    // Normaliser le contenu
    normalizeContent(content)

    return response.view('index', {
      content,
      requiresPassword: false,
    })
  }
}
