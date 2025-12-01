import type { HttpContext } from '@adonisjs/core/http'
import SiteInvitation from '#models/site_invitation'
import Site from '#models/site'
import SiteAdmin from '#models/site_admin'
import SiteContent from '#models/site_content'
import User from '#models/user'
import { generateInvitationToken } from '#services/hash_service'
import { DateTime } from 'luxon'
import { renderView } from '#utils/view_helper.js'

export default class InvitationsController {
  /**
   * Créer une invitation pour un site (seul le propriétaire peut créer)
   */
  async create({ params, request, response, session }: HttpContext) {
    try {
      const hashSite = params.hashSite
      const site = await Site.findBy('hash', hashSite)

      if (!site) {
        return response.status(404).json({ error: 'Site introuvable' })
      }

      const userId = session.get('user_id')

      // Seul le propriétaire peut créer des invitations
      if (site.userId !== userId) {
        return response.status(403).json({ error: 'Seul le propriétaire peut créer des invitations' })
      }

      // Générer un token unique
      const token = await generateInvitationToken()

      // Définir l'expiration (30 jours par défaut)
      const expiresAt = DateTime.now().plus({ days: 30 })

      // Créer l'invitation
      const invitation = new SiteInvitation()
      invitation.siteId = site.id
      invitation.createdBy = userId
      invitation.token = token
      invitation.expiresAt = expiresAt
      invitation.used = false
      await invitation.save()

      // Construire l'URL complète de l'invitation
      const protocol = request.header('x-forwarded-proto') || 'http'
      const host = request.header('host') || 'localhost:3000'
      const invitationUrl = `${protocol}://${host}/invite/${token}`

      return response.json({
        success: true,
        token: token,
        invitationUrl: invitationUrl,
        expiresAt: expiresAt.toISO(),
      })
    } catch (error) {
      console.error("Erreur lors de la création de l'invitation:", error)
      return response.status(500).json({
        success: false,
        error: "Erreur lors de la création de l'invitation",
      })
    }
  }

  /**
   * Lister les invitations d'un site (uniquement les invitations actives)
   */
  async index({ params, response, session }: HttpContext) {
    try {
      const hashSite = params.hashSite
      const site = await Site.findBy('hash', hashSite)

      if (!site) {
        return response.status(404).json({ error: 'Site introuvable' })
      }

      const userId = session.get('user_id')

      // Seul le propriétaire peut voir les invitations
      if (site.userId !== userId) {
        return response.status(403).json({ error: 'Seul le propriétaire peut voir les invitations' })
      }

      // Récupérer uniquement les invitations actives (non utilisées et non expirées)
      const now = DateTime.now()
      const invitations = await SiteInvitation.query()
        .where('site_id', site.id)
        .where('used', false)
        .where('expires_at', '>', now.toSQL())
        .orderBy('created_at', 'desc')

      return response.json({
        success: true,
        invitations: invitations,
      })
    } catch (error) {
      console.error("Erreur lors de la récupération des invitations:", error)
      return response.status(500).json({
        success: false,
        error: "Erreur lors de la récupération des invitations",
      })
    }
  }

  /**
   * Supprimer une invitation
   */
  async destroy({ params, response, session }: HttpContext) {
    try {
      const hashSite = params.hashSite
      const invitationId = parseInt(params.invitationId)

      const site = await Site.findBy('hash', hashSite)
      if (!site) {
        return response.status(404).json({ error: 'Site introuvable' })
      }

      const userId = session.get('user_id')

      // Seul le propriétaire peut supprimer des invitations
      if (site.userId !== userId) {
        return response.status(403).json({ error: 'Seul le propriétaire peut supprimer des invitations' })
      }

      // Vérifier que l'invitation appartient bien au site
      const invitation = await SiteInvitation.query()
        .where('id', invitationId)
        .where('site_id', site.id)
        .first()

      if (!invitation) {
        return response.status(404).json({ error: 'Invitation introuvable' })
      }

      // Supprimer l'invitation
      await invitation.delete()

      return response.json({
        success: true,
      })
    } catch (error) {
      console.error("Erreur lors de la suppression de l'invitation:", error)
      return response.status(500).json({
        success: false,
        error: "Erreur lors de la suppression de l'invitation",
      })
    }
  }

  /**
   * Page pour accepter une invitation
   */
  async show({ params, response, session }: HttpContext) {
    const token = params.token

    // Vérifier l'invitation
    const invitation = await SiteInvitation.findBy('token', token)

    if (!invitation) {
      return renderView(response, 'invite-error', {
        error: 'Invitation introuvable',
        message: "Cette invitation n'existe pas ou a été supprimée.",
      })
    }

    // Vérifier si l'invitation a expiré
    const now = DateTime.now()
    const expiresAt = DateTime.fromJSDate(invitation.expiresAt.toJSDate())

    if (now > expiresAt) {
      return renderView(response, 'invite-error', {
        error: 'Invitation expirée',
        message: 'Cette invitation a expiré. Veuillez demander une nouvelle invitation.',
      })
    }

    // Vérifier si l'invitation a déjà été utilisée
    if (invitation.used) {
      return renderView(response, 'invite-error', {
        error: 'Invitation déjà utilisée',
        message: 'Cette invitation a déjà été utilisée.',
      })
    }

    // Récupérer les informations du site
    const site = await Site.find(invitation.siteId)
    if (!site) {
      return renderView(response, 'invite-error', {
        error: 'Site introuvable',
        message: 'Le site associé à cette invitation n\'existe plus.',
      })
    }

    // Si l'utilisateur est déjà connecté, accepter directement l'invitation
    const userId = session.get('user_id')
    if (userId) {
      // Vérifier si l'utilisateur est le propriétaire du site
      if (site.userId === userId) {
        const user = await User.find(userId)
        return renderView(response, 'invite-success', {
          message: 'Vous êtes déjà le propriétaire de ce site. Aucune action nécessaire.',
          siteHash: site.hash,
          userHash: user?.hash,
        })
      }

      // Vérifier si l'utilisateur est déjà administrateur invité
      const adminCheck = await SiteAdmin.query()
        .where('site_id', site.id)
        .where('user_id', userId)
        .first()

      if (adminCheck) {
        const user = await User.find(userId)
        return renderView(response, 'invite-success', {
          message: 'Vous êtes déjà administrateur de ce site.',
          siteHash: site.hash,
          userHash: user?.hash,
        })
      }

      // Accepter l'invitation
      try {
        // Ajouter l'utilisateur comme administrateur
        const siteAdmin = new SiteAdmin()
        siteAdmin.siteId = site.id
        siteAdmin.userId = userId
        await siteAdmin.save()

        // Marquer l'invitation comme utilisée
        invitation.used = true
        invitation.usedBy = userId
        invitation.usedAt = DateTime.now()
        await invitation.save()

        // Récupérer le hash de l'utilisateur
        const user = await User.find(userId)

        return renderView(response, 'invite-success', {
          message: 'Invitation acceptée avec succès ! Vous êtes maintenant administrateur de ce site.',
          siteHash: site.hash,
          userHash: user?.hash,
        })
      } catch (error) {
        console.error("Erreur lors de l'acceptation de l'invitation:", error)
        return renderView(response, 'invite-error', {
          error: 'Erreur',
          message: "Une erreur est survenue lors de l'acceptation de l'invitation.",
        })
      }
    }

    // Si l'utilisateur n'est pas connecté, afficher la page d'invitation avec options de connexion/inscription
    const content = await SiteContent.findBy('siteId', site.id)
    const siteTitle = content ? content.title : 'Site'

    return renderView(response, 'invite', {
      token: token,
      siteTitle: siteTitle,
      siteHash: site.hash,
    })
  }

  /**
   * Accepter une invitation après connexion/inscription
   */
  async accept({ params, response, session }: HttpContext) {
    const token = params.token
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    // Vérifier l'invitation
    const invitation = await SiteInvitation.findBy('token', token)

    if (!invitation) {
      return response.status(404).json({ error: 'Invitation introuvable' })
    }

    // Vérifier si l'invitation a expiré
    const now = DateTime.now()
    const expiresAt = DateTime.fromJSDate(invitation.expiresAt.toJSDate())

    if (now > expiresAt) {
      return response.status(400).json({ error: 'Invitation expirée' })
    }

    // Vérifier si l'invitation a déjà été utilisée
    if (invitation.used) {
      return response.status(400).json({ error: 'Invitation déjà utilisée' })
    }

    // Récupérer les informations du site
    const site = await Site.find(invitation.siteId)
    if (!site) {
      return response.status(404).json({ error: 'Site introuvable' })
    }

    // Vérifier si l'utilisateur est le propriétaire du site
    if (site.userId === userId) {
      const user = await User.find(userId)
      return response.json({
        success: true,
        message: 'Vous êtes déjà le propriétaire de ce site. Aucune action nécessaire.',
        siteHash: site.hash,
        userHash: user?.hash,
      })
    }

    // Vérifier si l'utilisateur est déjà administrateur invité
    const adminCheck = await SiteAdmin.query()
      .where('site_id', site.id)
      .where('user_id', userId)
      .first()

    if (adminCheck) {
      const user = await User.find(userId)
      return response.json({
        success: true,
        message: 'Vous êtes déjà administrateur de ce site.',
        siteHash: site.hash,
        userHash: user?.hash,
      })
    }

    try {
      // Ajouter l'utilisateur comme administrateur
      const siteAdmin = new SiteAdmin()
      siteAdmin.siteId = site.id
      siteAdmin.userId = userId
      await siteAdmin.save()

      // Marquer l'invitation comme utilisée
      invitation.used = true
      invitation.usedBy = userId
      invitation.usedAt = DateTime.now()
      await invitation.save()

      // Récupérer le hash de l'utilisateur
      const user = await User.find(userId)

      return response.json({
        success: true,
        message: 'Invitation acceptée avec succès !',
        siteHash: site.hash,
        userHash: user?.hash,
      })
    } catch (error) {
      console.error("Erreur lors de l'acceptation de l'invitation:", error)
      return response.status(500).json({ error: "Erreur lors de l'acceptation de l'invitation" })
    }
  }

  /**
   * Lister les administrateurs d'un site
   */
  async listAdmins({ params, response, session }: HttpContext) {
    try {
      const hashSite = params.hashSite
      const site = await Site.findBy('hash', hashSite)

      if (!site) {
        return response.status(404).json({ error: 'Site introuvable' })
      }

      const userId = session.get('user_id')

      // Seul le propriétaire peut voir les administrateurs
      if (site.userId !== userId) {
        return response.status(403).json({ error: 'Seul le propriétaire peut voir les administrateurs' })
      }

      // Récupérer les administrateurs invités
      const invitedAdmins = await SiteAdmin.query()
        .where('site_id', site.id)
        .preload('user')
        .exec()

      // Récupérer le propriétaire
      const owner = await User.find(site.userId)

      // Combiner le propriétaire et les administrateurs invités
      const allAdmins = owner
        ? [
            { ...owner.serialize(), isOwner: true },
            ...invitedAdmins.map((admin) => ({ ...admin.user.serialize(), isOwner: false })),
          ]
        : invitedAdmins.map((admin) => ({ ...admin.user.serialize(), isOwner: false }))

      return response.json({
        success: true,
        admins: allAdmins,
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des administrateurs:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des administrateurs',
      })
    }
  }

  /**
   * Retirer un administrateur d'un site
   */
  async removeAdmin({ params, response, session }: HttpContext) {
    try {
      const hashSite = params.hashSite
      const adminId = parseInt(params.adminId)

      const site = await Site.findBy('hash', hashSite)
      if (!site) {
        return response.status(404).json({ error: 'Site introuvable' })
      }

      const userId = session.get('user_id')

      // Seul le propriétaire peut retirer des administrateurs
      if (site.userId !== userId) {
        return response.status(403).json({ error: 'Seul le propriétaire peut retirer des administrateurs' })
      }

      // Ne pas permettre de retirer le propriétaire
      if (site.userId === adminId) {
        return response.status(400).json({ error: 'Impossible de retirer le propriétaire du site' })
      }

      // Retirer l'administrateur
      const siteAdmin = await SiteAdmin.query()
        .where('site_id', site.id)
        .where('user_id', adminId)
        .first()

      if (siteAdmin) {
        await siteAdmin.delete()
      }

      return response.json({
        success: true,
      })
    } catch (error) {
      console.error('Erreur lors du retrait de l\'administrateur:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors du retrait de l\'administrateur',
      })
    }
  }
}
