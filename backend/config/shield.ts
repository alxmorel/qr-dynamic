import { defineConfig } from '@adonisjs/shield'
import env from '#start/env'

const shieldConfig = defineConfig({
  csrf: {
    enabled: false, // Temporairement désactivé pour les tests
    exceptRoutes: [],
    enableXsrfCookie: false,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },
  csp: {
    enabled: false,
  },
  xFrame: {
    enabled: true,
    action: 'DENY',
  },
  contentTypeSniffing: {
    enabled: true,
  },
})

export default shieldConfig

