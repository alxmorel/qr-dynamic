import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'site_invitations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('site_id').unsigned().notNullable().references('id').inTable('sites').onDelete('CASCADE')
      table.integer('created_by').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('token', 255).notNullable().unique()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.boolean('used').notNullable().defaultTo(false)
      table.integer('used_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('used_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Index
      table.index('token', 'idx_site_invitations_token')
      table.index('site_id', 'idx_site_invitations_site_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
