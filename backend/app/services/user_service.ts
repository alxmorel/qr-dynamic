import User from '#models/user'
import Site from '#models/site'
import { generateUniqueUserHash, generateUniqueSiteHash } from './hash_service.js'
import { hashPassword, generateAvailableUsername } from './password_service.js'

/**
 * Crée un nouvel utilisateur avec un site par défaut
 */
export async function createUserWithSite(
  username: string,
  email: string,
  password: string | null,
  options: { passwordHashOverride?: string; googleId?: string } = {}
): Promise<{ user: User; site: Site }> {
  // Vérifier si l'email ou le username existe déjà
  const existingEmail = await User.findBy('email', email)
  if (existingEmail) {
    throw new Error('Cet email est déjà utilisé')
  }

  const existingUsername = await User.findBy('username', username)
  if (existingUsername) {
    throw new Error("Ce nom d'utilisateur est déjà utilisé")
  }

  let passwordHash: string
  if (options.passwordHashOverride) {
    passwordHash = options.passwordHashOverride
  } else {
    if (!password) {
      throw new Error('Un mot de passe est requis')
    }
    passwordHash = await hashPassword(password)
  }

  // Générer un hash unique pour l'utilisateur
  const userHash = await generateUniqueUserHash()
  const googleId = options.googleId || null

  // Créer l'utilisateur
  const user = new User()
  user.hash = userHash
  user.username = username
  user.email = email
  user.passwordHash = passwordHash
  user.googleId = googleId
  await user.save()

  // Générer un hash unique pour le site
  const siteHash = await generateUniqueSiteHash()

  // Créer le site par défaut
  const site = new Site()
  site.hash = siteHash
  site.userId = user.id
  site.publicPasswordEnabled = false
  await site.save()

  return { user, site }
}

