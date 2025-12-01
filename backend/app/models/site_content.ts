import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeSave, afterFind } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Site from './site.js'
import { encrypt, decrypt } from '../services/encryption_service.js'

export default class SiteContent extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'site_id' })
  declare siteId: number

  @column()
  declare type: string

  @column()
  declare value: string | null

  @column()
  declare title: string | null

  @column({ columnName: 'background_color' })
  declare backgroundColor: string | null

  @column({ columnName: 'background_image' })
  declare backgroundImage: string | null

  @column({ columnName: 'card_background_color' })
  declare cardBackgroundColor: string | null

  @column()
  declare favicon: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Site, {
    foreignKey: 'site_id',
  })
  declare site: BelongsTo<typeof Site>

  // Hooks pour chiffrer/déchiffrer automatiquement
  @beforeSave()
  static async encryptFields(content: SiteContent) {
    // Chiffrer les champs sensibles avant sauvegarde seulement s'ils sont modifiés
    if (content.$dirty.value && content.value !== null && content.value !== '') {
      const encrypted = encrypt(content.value)
      if (encrypted) {
        content.value = encrypted
      }
    }
    if (content.$dirty.title && content.title !== null && content.title !== '') {
      const encrypted = encrypt(content.title)
      if (encrypted) {
        content.title = encrypted
      }
    }
    if (content.$dirty.backgroundImage && content.backgroundImage !== null && content.backgroundImage !== '') {
      const encrypted = encrypt(content.backgroundImage)
      if (encrypted) {
        content.backgroundImage = encrypted
      }
    }
    if (content.$dirty.favicon && content.favicon !== null && content.favicon !== '') {
      const encrypted = encrypt(content.favicon)
      if (encrypted) {
        content.favicon = encrypted
      }
    }
  }

  @afterFind()
  static async decryptFields(content: SiteContent) {
    // Déchiffrer les champs sensibles après récupération
    if (content.value) {
      content.value = decrypt(content.value) || content.value
    }
    if (content.title) {
      content.title = decrypt(content.title) || content.title
    }
    if (content.backgroundImage) {
      content.backgroundImage = decrypt(content.backgroundImage) || content.backgroundImage
    }
    if (content.favicon) {
      content.favicon = decrypt(content.favicon) || content.favicon
    }
  }
}
