import { defineConfig, stores } from '@adonisjs/session'
import env from '#start/env'

const sessionConfig = defineConfig({
  enabled: true,
  driver: 'cookie',
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  age: '2h',
  cookie: {
    path: '/',
    httpOnly: true,
    sameSite: false,
    secure: env.get('NODE_ENV') === 'production',
  },
  store: 'cookie',
  stores: {
    cookie: stores.cookie(),
  },
})

export default sessionConfig

