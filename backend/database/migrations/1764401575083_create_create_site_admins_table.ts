import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'site_admins'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('site_id').unsigned().notNullable().references('id').inTable('sites').onDelete('CASCADE')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Contrainte unique pour éviter les doublons
      table.unique(['site_id', 'user_id'])

      // Index
      table.index('site_id', 'idx_site_admins_site_id')
      table.index('user_id', 'idx_site_admins_user_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
