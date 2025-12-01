import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Site from '#models/site'
import SiteAdmin from '#models/site_admin'
import { generateUniqueUserHash } from '#app/services/hash_service.js'

/**
 * Middleware pour vérifier si l'utilisateur est connecté
 */
export async function requireAuth(ctx: HttpContext, next: () => Promise<void>) {
  const userId = ctx.session.get('user_id')

  if (!userId) {
    return ctx.response.redirect('/login')
  }

  await next()
}

/**
 * Middleware pour vérifier que l'utilisateur correspond au hashUser
 */
export async function requireUserHash(ctx: HttpContext, next: () => Promise<void>) {
  const hashUser = ctx.params.hashUser

  if (!hashUser) {
    return ctx.response.status(400).send('Hash utilisateur manquant')
  }

  const user = await User.findBy('hash', hashUser)

  if (!user) {
    return ctx.response.status(404).send('Utilisateur introuvable')
  }

  const userId = ctx.session.get('user_id')
  if (user.id !== userId) {
    return ctx.response.status(403).send("Accès interdit : vous n'êtes pas autorisé à accéder à cette page")
  }

  ctx.user = user
  ctx.userHash = hashUser

  await next()
}

/**
 * Middleware pour vérifier que l'utilisateur est propriétaire ou administrateur du site
 */
export async function requireSiteOwner(ctx: HttpContext, next: () => Promise<void>) {
  const hash = ctx.params.hash || ctx.params.hashSite

  if (!hash) {
    return ctx.response.status(400).send('Hash manquant')
  }

  const site = await Site.findBy('hash', hash)

  if (!site) {
    return ctx.response.status(404).send('Site introuvable')
  }

  const userId = ctx.session.get('user_id')

  // Vérifier si l'utilisateur est le propriétaire
  if (site.userId === userId) {
    ctx.site = site
    ctx.isOwner = true
    return await next()
  }

  // Vérifier si l'utilisateur est un administrateur invité
  const adminCheck = await SiteAdmin.query()
    .where('site_id', site.id)
    .where('user_id', userId)
    .first()

  if (adminCheck) {
    ctx.site = site
    ctx.isOwner = false
    return await next()
  }

  return ctx.response.status(403).send("Accès interdit : vous n'êtes pas autorisé à accéder à ce site")
}

/**
 * Fonction pour obtenir l'utilisateur actuel
 */
export async function getCurrentUser(ctx: HttpContext): Promise<User | null> {
  const userId = ctx.session.get('user_id')

  if (!userId) {
    return null
  }

  return await User.find(userId)
}

/**
 * S'assure qu'un utilisateur a un hash
 */
export async function ensureUserHash(user: User | null): Promise<string | null> {
  if (!user) {
    return null
  }

  if (!user.hash) {
    const userHash = await generateUniqueUserHash()
    user.hash = userHash
    await user.save()
  }

  return user.hash
}

