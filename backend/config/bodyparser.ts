import { defineConfig } from '@adonisjs/core/bodyparser'

const bodyparserConfig = defineConfig({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  form: {
    convertEmptyStringsToNull: true,
    types: ['application/x-www-form-urlencoded'],
  },
  json: {
    types: ['application/json', 'text/json'],
  },
  multipart: {
    autoProcess: true,
    processManually: [],
    maxFields: 1000,
    limit: '20mb',
    types: ['multipart/form-data'],
  },
})

export default bodyparserConfig

