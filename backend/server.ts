/*
|--------------------------------------------------------------------------
| HTTP server entrypoint
|--------------------------------------------------------------------------
|
| The "server.ts" file is the entrypoint for starting the AdonisJS HTTP
| server. Either you can run this file directly or use the "serve"
| command to run this file and monitor file changes
|
*/

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('./', import.meta.url)

/**
 * The ignitor exposes the HTTP server, the console
 * kernel and the application kernel
 */
const ignitor = new Ignitor(APP_ROOT, {
  importer: (url) => import(url),
})

/**
 * Starting the HTTP server
 */
try {
  await ignitor.httpServer().start()
} catch (error) {
  process.exitCode = 1
  prettyPrintError(error)
}

