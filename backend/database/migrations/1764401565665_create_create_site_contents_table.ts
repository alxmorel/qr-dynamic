import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'site_content'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('site_id').unsigned().notNullable().references('id').inTable('sites').onDelete('CASCADE')
      table.string('type', 50).notNullable()
      table.text('value').nullable()
      table.text('title').nullable()
      table.string('background_color', 50).nullable()
      table.text('background_image').nullable()
      table.string('card_background_color', 50).nullable()
      table.text('favicon').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Index
      table.index('site_id', 'idx_site_content_site_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
