import User from '#models/user'
import Site from '#models/site'
import { generateUniqueUserHash } from './hash_service.js'
import { hashPassword, generateAvailableUsername } from './password_service.js'

/**
 * Trouve ou crée un utilisateur à partir d'un profil Google
 * @param googleId - Identifiant Google
 * @param email - Email récupéré via Google
 * @param displayName - Nom affiché Google
 * @returns Utilisateur créé ou trouvé
 */
export async function findOrCreateGoogleUser(
  googleId: string,
  email: string,
  displayName?: string
): Promise<User> {
  if (!googleId) {
    throw new Error('Identifiant Google manquant')
  }
  if (!email) {
    throw new Error('Impossible de récupérer votre email Google')
  }

  // Chercher un utilisateur existant avec ce Google ID
  const existingGoogleUser = await User.findBy('googleId', googleId)
  if (existingGoogleUser) {
    return existingGoogleUser
  }

  // Chercher un utilisateur existant avec cet email
  const existingEmailUser = await User.findBy('email', email)
  if (existingEmailUser) {
    // Lier le compte Google à l'utilisateur existant
    existingEmailUser.googleId = googleId
    await existingEmailUser.save()
    return existingEmailUser
  }

  // Créer un nouvel utilisateur
  const username = await generateAvailableUsername(displayName || email.split('@')[0])
  const userHash = await generateUniqueUserHash()
  const randomPassword = `google-${googleId}-${Date.now()}`
  const passwordHash = await hashPassword(randomPassword)

  const user = new User()
  user.hash = userHash
  user.username = username
  user.email = email
  user.passwordHash = passwordHash
  user.googleId = googleId
  await user.save()

  // Créer un site par défaut pour l'utilisateur
  const { generateUniqueSiteHash } = await import('./hash_service.js')
  const siteHash = await generateUniqueSiteHash()

  const site = new Site()
  site.hash = siteHash
  site.userId = user.id
  site.publicPasswordEnabled = false
  await site.save()

  return user
}

// Note: Les fonctions redirectUrl() et user() d'Ally nécessitent le contexte HTTP
// Elles seront utilisées directement dans les contrôleurs avec ctx.ally.use('google')

