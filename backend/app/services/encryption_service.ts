import crypto from 'crypto'
import env from '#start/env'

// Dériver une clé de 32 bytes à partir de la clé fournie
function deriveKey(keyString: string): Buffer {
  // Si la clé est déjà en hexadécimal de 64 caractères (32 bytes), la convertir
  if (keyString.length === 64) {
    return Buffer.from(keyString, 'hex')
  }
  // Sinon, utiliser PBKDF2 pour dériver une clé de 32 bytes
  return crypto.pbkdf2Sync(keyString, 'salt', 100000, 32, 'sha256')
}

const ENCRYPTION_KEY = env.get('ENCRYPTION_KEY')
const KEY = deriveKey(ENCRYPTION_KEY)
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 16 bytes pour l'IV
const AUTH_TAG_LENGTH = 16 // 16 bytes pour le tag d'authentification

/**
 * Chiffre une chaîne de caractères
 * @param text - Texte à chiffrer
 * @returns Texte chiffré en base64 ou null si le texte est null/undefined
 */
export function encrypt(text: string | null | undefined): string | null {
  if (text === null || text === undefined || text === '') {
    return null
  }

  try {
    // Générer un IV aléatoire
    const iv = crypto.randomBytes(IV_LENGTH)

    // Créer le cipher
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)

    // Chiffrer le texte
    let encrypted = cipher.update(text, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    // Récupérer le tag d'authentification
    const authTag = cipher.getAuthTag()

    // Retourner IV + tag + texte chiffré (tout en base64)
    // Format: iv:authTag:encrypted
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
  } catch (error) {
    console.error('Erreur lors du chiffrement:', error)
    throw error
  }
}

/**
 * Déchiffre une chaîne de caractères
 * @param encryptedText - Texte chiffré en base64 (format: iv:authTag:encrypted)
 * @returns Texte déchiffré ou null si le texte est null/undefined
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  if (encryptedText === null || encryptedText === undefined || encryptedText === '') {
    return null
  }

  try {
    // Vérifier si le texte est déjà chiffré (format: iv:authTag:encrypted)
    // Si ce n'est pas le cas, c'est probablement une ancienne donnée non chiffrée
    if (!encryptedText.includes(':')) {
      // Donnée non chiffrée (migration depuis ancienne version)
      return encryptedText
    }

    const parts = encryptedText.split(':')
    if (parts.length !== 3) {
      // Format invalide, retourner tel quel (probablement une ancienne donnée)
      return encryptedText
    }

    const [ivBase64, authTagBase64, encrypted] = parts

    // Convertir l'IV et le tag depuis base64
    const iv = Buffer.from(ivBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')

    // Créer le decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
    decipher.setAuthTag(authTag)

    // Déchiffrer le texte
    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    // Si le déchiffrement échoue, c'est probablement une ancienne donnée non chiffrée
    console.warn('Erreur lors du déchiffrement (donnée peut-être non chiffrée):', error)
    return encryptedText // Retourner tel quel pour compatibilité
  }
}

/**
 * Vérifie si une chaîne est chiffrée
 * @param text - Texte à vérifier
 * @returns True si le texte semble être chiffré
 */
export function isEncrypted(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') {
    return false
  }
  // Vérifier le format: iv:authTag:encrypted (3 parties séparées par :)
  const parts = text.split(':')
  if (parts.length === 3) {
    // Vérifier que les deux premières parties sont en base64 valide
    try {
      Buffer.from(parts[0], 'base64')
      Buffer.from(parts[1], 'base64')
      return true
    } catch (e) {
      return false
    }
  }
  return false
}

