import type { Response } from '@adonisjs/core/http'

/**
 * Helper temporaire pour les vues
 * Retourne du JSON pour l'instant, sera remplacé par de vraies vues plus tard
 */
export function renderView(response: Response, viewName: string, data: any) {
  // Pour l'instant, retourner du JSON avec les données
  return response.json({
    view: viewName,
    data: data,
    message: 'Cette route nécessite des vues. Les vues seront ajoutées plus tard.',
  })
}

