import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import PendingRegistration from '#models/pending_registration'
import SiteInvitation from '#models/site_invitation'
import SiteAdmin from '#models/site_admin'
import Site from '#models/site'
import { hashPassword, authenticateUser, generateAvailableUsername } from '#services/password_service'
import { generateInvitationToken, generateVerificationToken } from '#services/hash_service'
import { sendVerificationEmail } from '#services/mailer_service'
import { findOrCreateGoogleUser } from '#services/google_auth_service'
import { createUserWithSite } from '#services/user_service'
import { ensureUserHash } from '#middleware/auth_middleware'
import env from '#start/env'
import ally from '@adonisjs/ally/services/main'
import { DateTime } from 'luxon'
import { renderView } from '#utils/view_helper.js'

export default class AuthController {
  /**
   * Affiche la page d'inscription
   */
  async showRegister({ response, session, params, request }: HttpContext) {
    const userId = session.get('user_id')

    if (userId) {
      // Si déjà connecté et qu'il y a une invitation, rediriger vers l'invitation
      if (params.invite) {
        return response.redirect(`/invite/${params.invite}`)
      }

      // Si déjà connecté, rediriger vers la liste des sites
      const user = await User.find(userId)
      if (user && user.hash) {
        return response.redirect(`/admin/${user.hash}/sites`)
      }

      return response.redirect('/')
    }

    const error = request.input('error') ? decodeURIComponent(request.input('error')) : null
    const success = request.input('success') ? decodeURIComponent(request.input('success')) : null
    const inviteToken = params.invite || request.input('inviteToken') || null
    const googleAuthEnabled = Boolean(env.get('GOOGLE_CLIENT_ID') && env.get('GOOGLE_CLIENT_SECRET'))
    const googleAuthUrl = inviteToken ? `/auth/google?inviteToken=${encodeURIComponent(inviteToken)}` : '/auth/google'

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inscription - QR Dynamic</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf6ff; color: #1a1a1a; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .auth-card { background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: grid; grid-template-columns: 1fr 1fr; gap: 0; min-height: 600px; }
    .auth-illustration { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem; display: flex; align-items: center; border-radius: 16px 0 0 16px; }
    .auth-panel { padding: 3rem; display: flex; flex-direction: column; justify-content: center; }
    .auth-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .auth-illustration h2 { font-size: 2rem; margin-bottom: 1rem; }
    .auth-illustration p { font-size: 1.125rem; opacity: 0.9; margin-bottom: 2rem; }
    .auth-pill { background: rgba(255,255,255,0.2); padding: 0.75rem 1.5rem; border-radius: 30px; display: inline-flex; align-items: center; gap: 0.5rem; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .auth-panel p { color: #666; margin-bottom: 2rem; }
    .alert { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
    .alert-error { background: #fee; color: #c33; border: 1px solid #fcc; }
    .alert-success { background: #efe; color: #3c3; border: 1px solid #cfc; }
    .alert-info { background: #eef; color: #33c; border: 1px solid #ccf; display: flex; align-items: center; gap: 0.75rem; }
    form { display: flex; flex-direction: column; gap: 1.5rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    label { font-weight: 600; font-size: 0.875rem; color: #333; }
    input { padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; transition: border-color 0.2s; }
    input:focus { outline: none; border-color: #667eea; }
    button[type="submit"] { background: #667eea; color: white; padding: 0.875rem 2rem; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button[type="submit"]:hover { background: #5568d3; }
    .auth-divider { text-align: center; margin: 2rem 0; position: relative; }
    .auth-divider span { background: white; padding: 0 1rem; color: #999; }
    .auth-divider:before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #e0e0e0; z-index: -1; }
    .google-button { display: flex; align-items: center; gap: 1rem; padding: 0.875rem 1.5rem; background: white; border: 2px solid #e0e0e0; border-radius: 8px; text-decoration: none; color: #333; transition: all 0.2s; }
    .google-button:hover { border-color: #667eea; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .google-button__badge { width: 24px; height: 24px; }
    .google-button__content { display: flex; flex-direction: column; flex: 1; }
    .google-button__title { font-weight: 600; }
    .google-button__subtitle { font-size: 0.875rem; color: #666; }
    .auth-footer-link { margin-top: 2rem; text-align: center; color: #666; }
    .auth-footer-link a { color: #667eea; text-decoration: none; font-weight: 600; }
    .auth-footer-link a:hover { text-decoration: underline; }
    @media (max-width: 768px) {
      .auth-card { grid-template-columns: 1fr; }
      .auth-illustration { border-radius: 16px 16px 0 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="auth-card">
      <div class="auth-illustration">
        <div>
          <span class="auth-badge">Onboarding guidé</span>
          <h2>Lancez votre premier mini-site en moins de 5 minutes</h2>
          <p>
            Profitez d'un assistant pas-à-pas, de sections pré-remplies et d'un QR code immédiatement prêt à être imprimé.
          </p>
          <div class="auth-pill">
            <i class="fa-solid fa-star" aria-hidden="true"></i>
            +2 créateurs actifs
          </div>
        </div>
      </div>

      <div class="auth-panel">
        <div>
          <h1>Bienvenue sur QrDynamic</h1>
          <p>Créez votre compte et découvrez la création de sites web en un clic.</p>
        </div>

        ${error ? `<div class="alert alert-error">${error}</div>` : ''}
        ${success ? `<div class="alert alert-success">${success}</div>` : ''}

        <form method="POST" action="/register" id="registerForm">
          ${inviteToken ? `
            <input type="hidden" name="inviteToken" value="${inviteToken}" />
            <div class="alert alert-info">
              <i class="fa-solid fa-envelope" aria-hidden="true"></i>
              <span>Vous avez une invitation en attente. Créez un compte pour l'accepter.</span>
            </div>
          ` : ''}
          <input type="hidden" name="_csrf" id="csrfToken" />
          <div class="form-group">
            <label>Nom d'utilisateur :</label>
            <input type="text" name="username" required autofocus placeholder="Votre nom d'utilisateur" minlength="3" maxlength="30" />
          </div>
          <div class="form-group">
            <label>Email :</label>
            <input type="email" name="email" required placeholder="email@exemple.com" />
          </div>
          <div class="form-group">
            <label>Mot de passe :</label>
            <input type="password" name="password" required placeholder="Minimum 6 caractères" minlength="6" />
          </div>
          <div class="form-group">
            <label>Confirmer le mot de passe :</label>
            <input type="password" name="confirmPassword" required placeholder="Répétez le mot de passe" />
          </div>
          <button type="submit">Créer mon compte</button>
        </form>

        ${googleAuthEnabled ? `
          <div class="auth-divider"><span>ou</span></div>
          <a class="google-button" href="${googleAuthUrl}">
            <span class="google-button__badge">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
            </span>
            <span class="google-button__content">
              <span class="google-button__title">Continuer avec Google</span>
              <span class="google-button__subtitle">Connexion sécurisée via Google</span>
            </span>
          </a>
        ` : ''}

        <div class="auth-footer-link">
          <p>Déjà un compte ? <a href="/login">Se connecter</a></p>
        </div>
      </div>
    </div>
  </div>

  <footer style="text-align: center; padding: 2rem; color: #666; font-size: 0.875rem;">
    <p>Copyright © 2025 QrDynamic. All rights reserved.</p>
  </footer>
</body>
</html>`

    return response.type('text/html').send(html)
  }

  /**
   * Traite l'inscription
   */
  async register({ request, response, session }: HttpContext) {
    try {
      const { username, email, password, confirmPassword, inviteToken } = request.only([
        'username',
        'email',
        'password',
        'confirmPassword',
        'inviteToken',
      ])

      // Validation
      if (!username || !email || !password) {
        const params = new URLSearchParams()
        if (inviteToken) params.set('inviteToken', inviteToken)
        params.set('error', encodeURIComponent('Tous les champs sont requis'))
        return response.redirect(`/register?${params.toString()}`)
      }

      if (password !== confirmPassword) {
        const params = new URLSearchParams()
        if (inviteToken) params.set('inviteToken', inviteToken)
        params.set('error', encodeURIComponent('Les mots de passe ne correspondent pas'))
        return response.redirect(`/register?${params.toString()}`)
      }

      if (password.length < 6) {
        const params = new URLSearchParams()
        if (inviteToken) params.set('inviteToken', inviteToken)
        params.set('error', encodeURIComponent('Le mot de passe doit contenir au moins 6 caractères'))
        return response.redirect(`/register?${params.toString()}`)
      }

      // Nettoyer les inscriptions périmées
      const expiredDate = DateTime.now().minus({ hours: 24 })
      await PendingRegistration.query().where('expires_at', '<', expiredDate.toSQL()).delete()

      // Vérifier si email ou username déjà utilisés
      const existingEmail = await User.findBy('email', email)
      if (existingEmail) {
        const params = new URLSearchParams()
        if (inviteToken) params.set('inviteToken', inviteToken)
        params.set('error', encodeURIComponent('Cet email est déjà utilisé'))
        return response.redirect(`/register?${params.toString()}`)
      }

      const existingUsername = await User.findBy('username', username)
      if (existingUsername) {
        const params = new URLSearchParams()
        if (inviteToken) params.set('inviteToken', inviteToken)
        params.set('error', encodeURIComponent('Ce nom d\'utilisateur est déjà utilisé'))
        return response.redirect(`/register?${params.toString()}`)
      }

      const pendingEmail = await PendingRegistration.findBy('email', email)
      if (pendingEmail) {
        const params = new URLSearchParams()
        if (inviteToken) params.set('inviteToken', inviteToken)
        params.set('error', encodeURIComponent('Une inscription est déjà en attente avec cet email. Vérifiez vos emails.'))
        return response.redirect(`/register?${params.toString()}`)
      }

      const pendingUsername = await PendingRegistration.findBy('username', username)
      if (pendingUsername) {
        const params = new URLSearchParams()
        if (inviteToken) params.set('inviteToken', inviteToken)
        params.set('error', encodeURIComponent('Une inscription est déjà en attente avec ce nom d\'utilisateur. Vérifiez vos emails.'))
        return response.redirect(`/register?${params.toString()}`)
      }

      // Hasher le mot de passe
      const passwordHash = await hashPassword(password)
      const verificationToken = await generateVerificationToken()
      const expiresAt = DateTime.now().plus({ hours: 24 })

      // Créer l'inscription en attente
      const pendingRegistration = new PendingRegistration()
      pendingRegistration.username = username
      pendingRegistration.email = email
      pendingRegistration.passwordHash = passwordHash
      pendingRegistration.inviteToken = inviteToken || null
      pendingRegistration.verificationToken = verificationToken
      pendingRegistration.expiresAt = expiresAt
      await pendingRegistration.save()

      // Envoyer l'email de vérification
      const baseUrl = env.get('APP_BASE_URL')
      const verificationLink = `${baseUrl}/verify-email/${verificationToken}`

      await sendVerificationEmail(email, verificationLink)

      const params = new URLSearchParams()
      if (inviteToken) params.set('inviteToken', inviteToken)
      params.set('success', encodeURIComponent('Nous avons envoyé un email de confirmation. Cliquez sur le lien reçu pour finaliser la création de votre compte.'))
      return response.redirect(`/register?${params.toString()}`)
    } catch (error: any) {
      console.error('Erreur lors de la préparation de l\'inscription:', error)
      const params = new URLSearchParams()
      const inviteToken = request.input('inviteToken')
      if (inviteToken) params.set('inviteToken', inviteToken)
      params.set('error', encodeURIComponent(error.message || "Impossible d'envoyer l'email de vérification"))
      return response.redirect(`/register?${params.toString()}`)
    }
  }

  /**
   * Vérifie l'email et crée le compte
   */
  async verifyEmail({ params, response, session }: HttpContext) {
    const token = params.token

    try {
      // Nettoyer les inscriptions périmées
      const expiredDate = DateTime.now().minus({ hours: 24 })
      await PendingRegistration.query().where('expires_at', '<', expiredDate.toSQL()).delete()

      const pendingRegistration = await PendingRegistration.findBy('verificationToken', token)

      if (!pendingRegistration) {
        return renderView(response, 'verify-email', {
          success: false,
          title: 'Lien invalide',
          message: 'Ce lien de vérification est invalide ou a déjà été utilisé.',
        })
      }

      const now = DateTime.now()
      const expiresAt = DateTime.fromJSDate(pendingRegistration.expiresAt.toJSDate())

      if (now > expiresAt) {
        await pendingRegistration.delete()
        return renderView(response, 'verify-email', {
          success: false,
          title: 'Lien expiré',
          message: 'Ce lien de vérification a expiré. Recommencez l\'inscription pour recevoir un nouveau lien.',
        })
      }

      // Créer l'utilisateur définitivement
      const { user } = await createUserWithSite(
        pendingRegistration.username,
        pendingRegistration.email,
        null,
        { passwordHashOverride: pendingRegistration.passwordHash }
      )

      // Nettoyer l'inscription en attente
      await pendingRegistration.delete()

      // Connecter automatiquement l'utilisateur
      session.put('user_id', user.id)

      // S'il y avait une invitation, l'accepter automatiquement
      if (pendingRegistration.inviteToken) {
        try {
          const invitation = await SiteInvitation.findBy('token', pendingRegistration.inviteToken)
          if (invitation && !invitation.used) {
            const expiresAtInvite = DateTime.fromJSDate(invitation.expiresAt.toJSDate())
            if (now <= expiresAtInvite) {
              const siteInvited = await Site.find(invitation.siteId)
              if (siteInvited) {
                if (siteInvited.userId === user.id) {
                  return response.redirect(`/invite/${pendingRegistration.inviteToken}`)
                }

                const adminCheck = await SiteAdmin.query()
                  .where('site_id', siteInvited.id)
                  .where('user_id', user.id)
                  .first()

                if (adminCheck) {
                  return response.redirect(`/invite/${pendingRegistration.inviteToken}`)
                }

                // Ajouter l'utilisateur comme administrateur
                const siteAdmin = new SiteAdmin()
                siteAdmin.siteId = siteInvited.id
                siteAdmin.userId = user.id
                await siteAdmin.save()

                // Marquer l'invitation comme utilisée
                invitation.used = true
                invitation.usedBy = user.id
                invitation.usedAt = DateTime.now()
                await invitation.save()

                return response.redirect(`/invite/${pendingRegistration.inviteToken}`)
              }
            }
          }
        } catch (error) {
          console.error("Erreur lors de l'acceptation de l'invitation après vérification d'email:", error)
        }
      }

      return response.redirect(`/admin/${user.hash}/sites`)
    } catch (error: any) {
      console.error('Erreur lors de la vérification d\'email:', error)
      return renderView(response, 'verify-email', {
        success: false,
        title: 'Erreur inattendue',
        message: 'Une erreur est survenue lors de la vérification de votre email. Veuillez réessayer.',
      })
    }
  }

  /**
   * Affiche la page de connexion
   */
  async showLogin({ response, session, params, request }: HttpContext) {
    const userId = session.get('user_id')

    if (userId) {
      // Si déjà connecté et qu'il y a une invitation, rediriger vers l'invitation
      if (params.invite) {
        return response.redirect(`/invite/${params.invite}`)
      }

      // Si déjà connecté, rediriger vers la liste des sites
      const user = await User.find(userId)
      if (user && user.hash) {
        return response.redirect(`/admin/${user.hash}/sites`)
      }

      return response.redirect('/')
    }

    const error = request.input('error') ? decodeURIComponent(request.input('error')) : null
    const success = params.success || request.input('success') || null
    const inviteToken = params.invite || request.input('inviteToken') || null
    const googleAuthEnabled = Boolean(env.get('GOOGLE_CLIENT_ID') && env.get('GOOGLE_CLIENT_SECRET'))
    const googleAuthUrl = inviteToken ? `/auth/google?inviteToken=${encodeURIComponent(inviteToken)}` : '/auth/google'

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connexion - QR Dynamic</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf6ff; color: #1a1a1a; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .auth-card { background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: grid; grid-template-columns: 1fr 1fr; gap: 0; min-height: 600px; }
    .auth-illustration { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem; display: flex; align-items: center; border-radius: 16px 0 0 16px; }
    .auth-panel { padding: 3rem; display: flex; flex-direction: column; justify-content: center; }
    .auth-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .auth-illustration h2 { font-size: 2rem; margin-bottom: 1rem; }
    .auth-illustration p { font-size: 1.125rem; opacity: 0.9; margin-bottom: 2rem; }
    .auth-pill { background: rgba(255,255,255,0.2); padding: 0.75rem 1.5rem; border-radius: 30px; display: inline-flex; align-items: center; gap: 0.5rem; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .auth-panel p { color: #666; margin-bottom: 2rem; }
    .alert { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
    .alert-error { background: #fee; color: #c33; border: 1px solid #fcc; }
    .alert-success { background: #efe; color: #3c3; border: 1px solid #cfc; }
    .alert-info { background: #eef; color: #33c; border: 1px solid #ccf; display: flex; align-items: center; gap: 0.75rem; }
    form { display: flex; flex-direction: column; gap: 1.5rem; }
    label { font-weight: 600; font-size: 0.875rem; color: #333; }
    input { padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; transition: border-color 0.2s; }
    input:focus { outline: none; border-color: #667eea; }
    button[type="submit"] { background: #667eea; color: white; padding: 0.875rem 2rem; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button[type="submit"]:hover { background: #5568d3; }
    .auth-divider { text-align: center; margin: 2rem 0; position: relative; }
    .auth-divider span { background: white; padding: 0 1rem; color: #999; }
    .auth-divider:before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #e0e0e0; z-index: -1; }
    .google-button { display: flex; align-items: center; gap: 1rem; padding: 0.875rem 1.5rem; background: white; border: 2px solid #e0e0e0; border-radius: 8px; text-decoration: none; color: #333; transition: all 0.2s; }
    .google-button:hover { border-color: #667eea; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .google-button__badge { width: 24px; height: 24px; }
    .google-button__content { display: flex; flex-direction: column; flex: 1; }
    .google-button__title { font-weight: 600; }
    .google-button__subtitle { font-size: 0.875rem; color: #666; }
    .auth-footer-link { margin-top: 2rem; text-align: center; color: #666; }
    .auth-footer-link a { color: #667eea; text-decoration: none; font-weight: 600; }
    .auth-footer-link a:hover { text-decoration: underline; }
    @media (max-width: 768px) {
      .auth-card { grid-template-columns: 1fr; }
      .auth-illustration { border-radius: 16px 16px 0 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="auth-card">
      <div class="auth-illustration">
        <div>
          <span class="auth-badge">Toujours connecté</span>
          <h2>Reprenez votre création là où vous l'avez laissée</h2>
          <p>
            Accédez rapidement à vos mini-sites, dupliquez vos pages et publiez de nouvelles mises à jour en direct.
          </p>
          <div class="auth-pill">
            <i class="fa-solid fa-users" aria-hidden="true"></i>
            +2 créateurs actifs cette semaine
          </div>
        </div>
      </div>

      <div class="auth-panel">
        <div>
          <h1>Bon retour</h1>
          <p>Connectez-vous pour accéder à vos sites.</p>
        </div>

        ${error ? `<div class="alert alert-error">${error}</div>` : ''}
        ${success ? `<div class="alert alert-success">${success}</div>` : ''}

        <form method="POST" action="/login" id="loginForm">
          ${inviteToken ? `
            <input type="hidden" name="inviteToken" value="${inviteToken}" />
            <div class="alert alert-info">
              <i class="fa-solid fa-envelope" aria-hidden="true"></i>
              <span>Vous avez une invitation en attente. Connectez-vous pour l'accepter.</span>
            </div>
          ` : ''}
          <input type="hidden" name="_csrf" id="csrfToken" />
          <label>Email ou nom d'utilisateur :</label>
          <input type="text" name="identifier" required autofocus placeholder="email@exemple.com ou username" />
          <label>Mot de passe :</label>
          <input type="password" name="password" required />
          <button type="submit">Se connecter</button>
        </form>

        ${googleAuthEnabled ? `
          <div class="auth-divider"><span>ou</span></div>
          <a class="google-button" href="${googleAuthUrl}">
            <span class="google-button__badge">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
            </span>
            <span class="google-button__content">
              <span class="google-button__title">Continuer avec Google</span>
              <span class="google-button__subtitle">Connexion sécurisée via Google</span>
            </span>
          </a>
        ` : ''}

        <div class="auth-footer-link">
          <p>Pas encore de compte ? <a href="/register">Créer un compte</a></p>
        </div>
      </div>
    </div>
  </div>

  <footer style="text-align: center; padding: 2rem; color: #666; font-size: 0.875rem;">
    <p>Copyright © 2025 QrDynamic. All rights reserved.</p>
  </footer>
  <script>
    // Récupérer le token CSRF depuis le cookie XSRF-TOKEN
    function getCookie(name) {
      const value = \`; \${document.cookie}\`;
      const parts = value.split(\`; \${name}=\`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    }
    const csrfToken = getCookie('XSRF-TOKEN');
    if (csrfToken) {
      const input = document.getElementById('csrfToken');
      if (input) input.value = decodeURIComponent(csrfToken);
    }
  </script>
</body>
</html>`

    return response.type('text/html').send(html)
  }

  /**
   * Traite la connexion
   */
  async login({ request, response, session }: HttpContext) {
    try {
      const { identifier, password, inviteToken } = request.only(['identifier', 'password', 'inviteToken'])

      if (!identifier || !password) {
        // Rediriger avec l'erreur en paramètre
        const params = new URLSearchParams()
        if (inviteToken) params.set('inviteToken', inviteToken)
        params.set('error', encodeURIComponent('Email/username et mot de passe requis'))
        return response.redirect(`/login?${params.toString()}`)
      }

      const user = await authenticateUser(identifier, password)

      if (!user) {
        // Rediriger avec l'erreur en paramètre
        const params = new URLSearchParams()
        if (inviteToken) params.set('inviteToken', inviteToken)
        params.set('error', encodeURIComponent('Identifiants incorrects'))
        return response.redirect(`/login?${params.toString()}`)
      }

      // Créer la session
      session.put('user_id', user.id)

      await ensureUserHash(user)

      // Si une invitation est présente, rediriger vers l'acceptation
      if (inviteToken) {
        return response.redirect(`/invite/${inviteToken}`)
      }

      // Rediriger vers la liste des sites
      return response.redirect(`/admin/${user.hash}/sites`)
    } catch (error: any) {
      // Rediriger avec l'erreur en paramètre
      const params = new URLSearchParams()
      const inviteToken = request.input('inviteToken')
      if (inviteToken) params.set('inviteToken', inviteToken)
      params.set('error', encodeURIComponent('Une erreur est survenue lors de la connexion'))
      return response.redirect(`/login?${params.toString()}`)
    }
  }

  /**
   * Route Google OAuth - redirection
   */
  async googleRedirect({ request, response, session, ally }: HttpContext) {
    const googleClientId = env.get('GOOGLE_CLIENT_ID')
    const googleClientSecret = env.get('GOOGLE_CLIENT_SECRET')

    if (!googleClientId || !googleClientSecret) {
      return response.status(503).send('La connexion Google n\'est pas disponible.')
    }

    if (request.input('inviteToken')) {
      session.put('pendingInviteToken', request.input('inviteToken'))
    }

    return ally.use('google').redirect((redirect) => {
      redirect.scopes(['profile', 'email'])
      redirect.param('prompt', 'select_account')
    })
  }

  /**
   * Route Google OAuth - callback
   */
  async googleCallback({ request, response, session, ally }: HttpContext) {
    const googleClientId = env.get('GOOGLE_CLIENT_ID')
    const googleClientSecret = env.get('GOOGLE_CLIENT_SECRET')

    if (!googleClientId || !googleClientSecret) {
      return response.redirect('/login?error=google')
    }

    try {
      const googleUser = await ally.use('google').user()

      if (!googleUser.email) {
        return response.redirect('/login?error=google')
      }

      const user = await findOrCreateGoogleUser(
        googleUser.id,
        googleUser.email,
        googleUser.name
      )

      // S'assurer que l'utilisateur a un hash
      await ensureUserHash(user)

      // Créer la session
      session.put('user_id', user.id)

      const inviteToken = session.get('pendingInviteToken')
      session.forget('pendingInviteToken')

      if (inviteToken) {
        return response.redirect(`/invite/${inviteToken}`)
      }

      if (user.hash) {
        return response.redirect(`/admin/${user.hash}/sites`)
      }

      return response.redirect('/')
    } catch (error) {
      console.error('Erreur lors de la connexion Google:', error)
      return response.redirect('/login?error=google')
    }
  }

  /**
   * Déconnexion
   */
  async logout({ session, response }: HttpContext) {
    await session.forget('user_id')
    return response.redirect('/')
  }
}
