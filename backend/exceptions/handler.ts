/*
|--------------------------------------------------------------------------
| Exception handler
|--------------------------------------------------------------------------
|
| The exception handler is used to convert an exception to a HTTP response.
|
*/

import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

export default class HttpExceptionHandler {
  async handle(error: unknown, ctx: HttpContext) {
    return ctx.response.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  async report(error: unknown, ctx: HttpContext) {
    if (!app.inProduction) {
      console.error(error)
    }
  }
}

