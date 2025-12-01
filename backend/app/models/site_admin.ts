import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Site from './site.js'
import User from './user.js'

export default class SiteAdmin extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'site_id' })
  declare siteId: number

  @column({ columnName: 'user_id' })
  declare userId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relations
  @belongsTo(() => Site, {
    foreignKey: 'site_id',
  })
  declare site: BelongsTo<typeof Site>

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>
}
