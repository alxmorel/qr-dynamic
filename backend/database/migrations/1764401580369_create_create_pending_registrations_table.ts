import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pending_registrations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('username', 255).notNullable()
      table.string('email', 255).notNullable()
      table.string('password_hash', 255).notNullable()
      table.string('invite_token', 255).nullable()
      table.string('verification_token', 255).notNullable().unique()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Index
      table.index('email', 'idx_pending_registrations_email')
      table.index('username', 'idx_pending_registrations_username')
      table.index('verification_token', 'idx_pending_registrations_token')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
