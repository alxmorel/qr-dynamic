/*
|--------------------------------------------------------------------------
| Ace entrypoint
|--------------------------------------------------------------------------
|
| The "ace.ts" file is the entrypoint for executing ace commands during
| development or in production.
|
*/

import { Ignitor, prettyPrintError } from '@adonisjs/core'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('./', import.meta.url)

/**
 * The ignitor exposes the ace kernel to run commands
 */
const ignitor = new Ignitor(APP_ROOT, {
  importer: (url) => import(url),
})

/**
 * Starting the ace kernel
 */
try {
  await ignitor.ace().handle(process.argv.slice(2))
} catch (error) {
  process.exitCode = 1
  prettyPrintError(error)
}

