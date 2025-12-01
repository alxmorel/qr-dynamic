import { defineConfig } from '@adonisjs/mail'
import env from '#start/env'

const mailConfig = defineConfig({
  default: 'smtp',
  mailers: {
    smtp: {
      driver: 'smtp',
      host: env.get('SMTP_HOST'),
      port: env.get('SMTP_PORT'),
      secure: env.get('SMTP_SECURE') === 'true',
      auth: {
        user: env.get('SMTP_USER'),
        pass: env.get('SMTP_PASS'),
      },
    },
  },
  from: {
    address: env.get('MAIL_FROM').replace(/^"|"$/g, ''), // Enlever les guillemets si présents
    name: env.get('APP_NAME'),
  },
})

export default mailConfig

