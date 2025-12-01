import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Site from './site.js'
import SiteAdmin from './site_admin.js'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare hash: string | null

  @column()
  declare username: string

  @column()
  declare email: string

  @column({ columnName: 'password_hash', serializeAs: null })
  declare passwordHash: string

  @column({ columnName: 'google_id' })
  declare googleId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relations
  @hasMany(() => Site, {
    foreignKey: 'user_id',
  })
  declare sites: HasMany<typeof Site>

  @manyToMany(() => Site, {
    pivotTable: 'site_admins',
    pivotForeignKey: 'user_id',
    pivotRelatedForeignKey: 'site_id',
    relatedKey: 'id',
  })
  declare adminSites: ManyToMany<typeof Site>

  // Méthodes utilitaires
  get password_hash() {
    return this.passwordHash
  }

  set password_hash(value: string) {
    this.passwordHash = value
  }
}
