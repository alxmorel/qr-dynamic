/*
|--------------------------------------------------------------------------
| Container bindings middleware
|--------------------------------------------------------------------------
|
| The container bindings middleware binds classes to their container
| bindings. The HTTP context can use these bindings to resolve
| values or classes.
|
*/

import { ContainerBindings } from '@adonisjs/core/types/http'
import { AppProvider } from '#start/container'

export default class ContainerBindingsMiddleware {
  handle(ctx: ContainerBindings, next: () => Promise<void>) {
    ctx.containerResolver.bindValue(AppProvider, new AppProvider(ctx.app))
    return next()
  }
}

