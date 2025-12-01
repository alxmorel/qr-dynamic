import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class PendingRegistration extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare username: string

  @column()
  declare email: string

  @column({ columnName: 'password_hash', serializeAs: null })
  declare passwordHash: string

  @column({ columnName: 'invite_token' })
  declare inviteToken: string | null

  @column({ columnName: 'verification_token' })
  declare verificationToken: string

  @column.dateTime({ columnName: 'expires_at' })
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
