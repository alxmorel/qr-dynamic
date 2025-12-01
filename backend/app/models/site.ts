import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasOne, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import SiteContent from './site_content.js'
import SiteInvitation from './site_invitation.js'
import SiteAdmin from './site_admin.js'

export default class Site extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare hash: string

  @column({ columnName: 'user_id' })
  declare userId: number

  @column({ columnName: 'public_password_enabled' })
  declare publicPasswordEnabled: boolean

  @column({ columnName: 'public_password_hash' })
  declare publicPasswordHash: string | null

  @column({ columnName: 'public_password' })
  declare publicPassword: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  @hasOne(() => SiteContent, {
    foreignKey: 'site_id',
  })
  declare content: HasOne<typeof SiteContent>

  @hasMany(() => SiteInvitation, {
    foreignKey: 'site_id',
  })
  declare invitations: HasMany<typeof SiteInvitation>

  @manyToMany(() => User, {
    pivotTable: 'site_admins',
    pivotForeignKey: 'site_id',
    pivotRelatedForeignKey: 'user_id',
    relatedKey: 'id',
  })
  declare admins: ManyToMany<typeof User>
}
