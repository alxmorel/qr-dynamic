import crypto from 'crypto'
import Site from '#models/site'
import User from '#models/user'
import SiteInvitation from '#models/site_invitation'

/**
 * Caractères alphanumériques (sans caractères ambigus comme 0, O, I, l)
 */
const CHARS = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Génère un hash unique aléatoire pour un site
 * @param length - Longueur du hash (défaut: 10)
 * @returns Hash unique
 */
export async function generateUniqueSiteHash(length: number = 10): Promise<string> {
  let hash: string
  let isUnique = false

  while (!isUnique) {
    // Générer un hash aléatoire
    const randomBytes = crypto.randomBytes(length)
    hash = ''

    for (let i = 0; i < length; i++) {
      hash += CHARS[randomBytes[i] % CHARS.length]
    }

    // Vérifier l'unicité dans la base de données
    const existing = await Site.findBy('hash', hash)
    if (!existing) {
      isUnique = true
    }
  }

  return hash
}

/**
 * Génère un hash unique aléatoire pour un utilisateur
 * @param length - Longueur du hash (défaut: 10)
 * @returns Hash unique
 */
export async function generateUniqueUserHash(length: number = 10): Promise<string> {
  let hash: string
  let isUnique = false

  while (!isUnique) {
    // Générer un hash aléatoire
    const randomBytes = crypto.randomBytes(length)
    hash = ''

    for (let i = 0; i < length; i++) {
      hash += CHARS[randomBytes[i] % CHARS.length]
    }

    // Vérifier l'unicité dans la base de données
    const existing = await User.findBy('hash', hash)
    if (!existing) {
      isUnique = true
    }
  }

  return hash
}

/**
 * Génère un token unique pour une invitation
 * @param length - Longueur du token (défaut: 32)
 * @returns Token unique
 */
export async function generateInvitationToken(length: number = 32): Promise<string> {
  let token: string
  let isUnique = false

  while (!isUnique) {
    // Générer un token aléatoire
    const randomBytes = crypto.randomBytes(length)
    token = ''

    for (let i = 0; i < length; i++) {
      token += CHARS[randomBytes[i] % CHARS.length]
    }

    // Vérifier l'unicité dans la base de données
    const existing = await SiteInvitation.findBy('token', token)
    if (!existing) {
      isUnique = true
    }
  }

  return token
}

/**
 * Génère un token de vérification unique
 * @param length - Longueur du token (défaut: 32)
 * @returns Token unique
 */
export async function generateVerificationToken(length: number = 32): Promise<string> {
  // Pour les tokens de vérification, on peut utiliser une approche plus simple
  // car ils sont stockés dans pending_registrations qui a une contrainte unique
  const randomBytes = crypto.randomBytes(length)
  let token = ''

  for (let i = 0; i < length; i++) {
    token += CHARS[randomBytes[i] % CHARS.length]
  }

  return token
}

