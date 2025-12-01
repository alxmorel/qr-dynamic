/*
|--------------------------------------------------------------------------
| Container bindings
|--------------------------------------------------------------------------
|
| The container bindings module is used to register bindings with the
| IoC container.
|
*/

import { ApplicationService } from '@adonisjs/core/types'

class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The application has been booted
   */
  async boot() {}

  /**
   * The application has been started
   */
  async start() {}

  /**
   * The process has been started. Perform cleanup, if any
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}

export default AppProvider
export { AppProvider }

