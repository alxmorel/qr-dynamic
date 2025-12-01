import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('hash', 255).unique().nullable()
      table.string('username', 255).notNullable().unique()
      table.string('email', 255).notNullable().unique()
      table.string('password_hash', 255).notNullable()
      table.string('google_id', 255).unique().nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Index
      table.index('hash', 'idx_users_hash')
      table.index('google_id', 'idx_users_google_id_unique', {
        unique: true,
        where: 'google_id IS NOT NULL',
      })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
