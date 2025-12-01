import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Site from './site.js'
import User from './user.js'

export default class SiteInvitation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'site_id' })
  declare siteId: number

  @column({ columnName: 'created_by' })
  declare createdBy: number

  @column()
  declare token: string

  @column({ columnName: 'expires_at' })
  declare expiresAt: DateTime

  @column()
  declare used: boolean

  @column({ columnName: 'used_by' })
  declare usedBy: number | null

  @column({ columnName: 'used_at' })
  declare usedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relations
  @belongsTo(() => Site, {
    foreignKey: 'site_id',
  })
  declare site: BelongsTo<typeof Site>

  @belongsTo(() => User, {
    foreignKey: 'created_by',
  })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'used_by',
  })
  declare usedByUser: BelongsTo<typeof User> | null
}
