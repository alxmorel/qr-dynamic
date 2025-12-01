import hash from '@adonisjs/core/services/hash'
import User from '#models/user'

/**
 * Hash un mot de passe avec bcrypt
 * @param password - Mot de passe en clair
 * @returns Hash du mot de passe
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash.make(password)
}

/**
 * Vérifie un mot de passe contre un hash
 * @param password - Mot de passe en clair
 * @param hashedPassword - Hash du mot de passe
 * @returns True si le mot de passe correspond
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await hash.verify(hashedPassword, password)
}

/**
 * Authentifie un utilisateur
 * @param identifier - Email ou username
 * @param password - Mot de passe en clair
 * @returns Utilisateur si authentifié, null sinon
 */
export async function authenticateUser(
  identifier: string,
  password: string
): Promise<User | null> {
  // Essayer de trouver par email d'abord
  let user = await User.findBy('email', identifier)

  // Si pas trouvé, essayer par username
  if (!user) {
    user = await User.findBy('username', identifier)
  }

  if (!user) {
    return null
  }

  // Vérifier le mot de passe
  const isValid = await verifyPassword(password, user.passwordHash)

  if (!isValid) {
    return null
  }

  return user
}

/**
 * Génère un nom d'utilisateur disponible à partir d'une base
 * @param base - Chaîne de base (nom, email, etc.)
 * @returns Nom d'utilisateur unique
 */
export async function generateAvailableUsername(base: string): Promise<string> {
  const normalizedBase =
    (base || 'utilisateur')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20) || 'user'

  let candidate = normalizedBase
  let suffix = 1

  while (await User.findBy('username', candidate)) {
    candidate = `${normalizedBase}${suffix}`
    suffix += 1
  }

  return candidate
}

