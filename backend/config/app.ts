import { defineConfig } from '@adonisjs/core/app'
import env from '#start/env'

export default defineConfig({
  appKey: env.get('APP_KEY'),
  http: {
    allowMethodSpoofing: false,
    trustProxy: false,
    forceContentNegotiationTo: 'application/json',
  },
})

