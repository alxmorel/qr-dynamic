import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sites'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('hash', 255).notNullable().unique()
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.boolean('public_password_enabled').notNullable().defaultTo(false)
      table.string('public_password_hash', 255).nullable()
      table.string('public_password', 255).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Index
      table.index('hash', 'idx_sites_hash')
      table.index('user_id', 'idx_sites_user_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
