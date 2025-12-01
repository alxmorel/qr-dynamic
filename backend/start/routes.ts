/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used to define HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

// Import des contrôleurs
const AuthController = () => import('#controllers/auth_controller')
const SitesController = () => import('#controllers/sites_controller')
const InvitationsController = () => import('#controllers/invitations_controller')
const AdminController = () => import('#controllers/admin_controller')

// Import des middlewares
import { requireAuth, requireUserHash, requireSiteOwner } from '#middleware/auth_middleware'

// Route d'accueil
router.get('/', async ({ response, session }) => {
  const userId = session.get('user_id')
  let user = null
  
  if (userId) {
    const User = (await import('#models/user')).default
    user = await User.find(userId)
    if (user && user.hash) {
      return response.redirect(`/admin/${user.hash}/sites`)
    }
  }
  
  // Afficher la page d'accueil HTML
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Dynamic - Accueil</title>
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
    .auth-list { list-style: none; }
    .auth-list li { padding: 0.5rem 0; padding-left: 1.5rem; position: relative; }
    .auth-list li:before { content: "✓"; position: absolute; left: 0; color: #4ade80; font-weight: bold; }
    .auth-eyebrow { text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; color: #667eea; margin-bottom: 0.5rem; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; color: #1a1a1a; }
    .auth-lead { font-size: 1.125rem; color: #666; margin-bottom: 2rem; }
    .home-cta, .home-actions { margin-bottom: 2rem; }
    .button { display: inline-block; padding: 0.875rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.2s; margin-right: 1rem; margin-bottom: 0.5rem; }
    .button.primary { background: #667eea; color: white; }
    .button.primary:hover { background: #5568d3; transform: translateY(-2px); }
    .button.ghost { background: transparent; color: #667eea; border: 2px solid #667eea; }
    .button.ghost:hover { background: #667eea; color: white; }
    .home-actions__card { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; }
    .home-actions__subtitle { color: #666; margin-top: 0.5rem; }
    .auth-steps { margin-top: 2rem; }
    .auth-steps h3 { font-size: 1.25rem; margin-bottom: 1rem; }
    .auth-steps ol { list-style: none; counter-reset: step; }
    .auth-steps li { counter-increment: step; padding-left: 3rem; margin-bottom: 1.5rem; position: relative; }
    .auth-steps li:before { content: counter(step); position: absolute; left: 0; top: 0; background: #667eea; color: white; width: 2rem; height: 2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .step-title { display: block; font-weight: 600; margin-bottom: 0.25rem; }
    .step-text { display: block; color: #666; font-size: 0.875rem; }
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
          <span class="auth-badge">Studio QR</span>
          <h2>Créez un mini-site vivant en quelques minutes</h2>
          <p>
            Ajoutez vos liens, contenus ou menus, puis mettez-les à jour sans jamais changer de QR code.
          </p>
          <ul class="auth-list">
            <li>Éditeur visuel intuitif</li>
            <li>Templates prêts à l'emploi</li>
            <li>Analytics intégrées</li>
          </ul>
        </div>
      </div>

      <div class="auth-panel">
        <p class="auth-eyebrow">Plateforme pour créateurs & restaurateurs</p>
        <h1>QR Dynamic</h1>
        <p class="auth-lead">
          Centralisez toutes vos informations derrière un seul lien dynamique. Idéal pour des cartes de restaurant, des portfolios, des offres temporaires ou des mini-sites événementiels.
        </p>

        ${user 
          ? `<div class="home-actions">
              <div class="home-actions__card">
                <p>Bienvenue, <strong>${user.username}</strong> 👋</p>
                <p class="home-actions__subtitle">Vos sites vous attendent.</p>
                <a class="button primary" href="/login">Accéder à mes sites</a>
              </div>
            </div>`
          : `<div class="home-cta">
              <a class="button primary" href="/register">Créer un compte</a>
              <a class="button ghost" href="/login">Se connecter</a>
            </div>`
        }

        <div class="auth-steps">
          <h3>Comment ça marche ?</h3>
          <ol>
            <li>
              <span class="step-title">Créez un compte gratuit</span>
              <span class="step-text">Un espace sécurisé pour tous vos sites.</span>
            </li>
            <li>
              <span class="step-title">Personnalisez votre page</span>
              <span class="step-text">Ajoutez blocs, couleurs, photos et menus.</span>
            </li>
            <li>
              <span class="step-title">Partagez votre QR code</span>
              <span class="step-text">Modifiez vos contenus sans re-impression.</span>
            </li>
          </ol>
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
})

// Routes d'authentification
router.get('/register', [AuthController, 'showRegister'])
router.post('/register', [AuthController, 'register'])
router.get('/verify-email/:token', [AuthController, 'verifyEmail'])
router.get('/login', [AuthController, 'showLogin'])
router.post('/login', [AuthController, 'login'])
router.get('/logout', [AuthController, 'logout'])
router.get('/auth/google', [AuthController, 'googleRedirect'])
router.get('/auth/google/callback', [AuthController, 'googleCallback'])

// Routes publiques des sites
router.post('/:hash/verify-password', [SitesController, 'verifyPassword'])
router.get('/:hash/content', [SitesController, 'getContent'])
router.get('/:hash', [SitesController, 'show'])

// Routes d'invitations
router.get('/invite/:token', [InvitationsController, 'show'])
router.post('/invite/:token/accept', [InvitationsController, 'accept']).use(async (ctx, next) => {
  await requireAuth(ctx, next)
})

// Routes admin - Sites
router
  .get('/admin/:hash', [AdminController, 'redirectOldUrl'])
  .use(async (ctx, next) => {
    await requireAuth(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireSiteOwner(ctx, next)
  })

router
  .get('/admin/:hashUser/sites', [AdminController, 'listSites'])
  .use(async (ctx, next) => {
    await requireAuth(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireUserHash(ctx, next)
  })

router
  .post('/admin/:hashUser/sites', [AdminController, 'createSite'])
  .use(async (ctx, next) => {
    await requireAuth(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireUserHash(ctx, next)
  })

router
  .get('/admin/:hashUser/sites/:hashSite', [AdminController, 'showSite'])
  .use(async (ctx, next) => {
    await requireAuth(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireUserHash(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireSiteOwner(ctx, next)
  })

router
  .post('/admin/:hashUser/sites/:hashSite', [AdminController, 'updateSite'])
  .use(async (ctx, next) => {
    await requireAuth(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireUserHash(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireSiteOwner(ctx, next)
  })

router
  .delete('/admin/:hashUser/sites/:hashSite', [AdminController, 'deleteSite'])
  .use(async (ctx, next) => {
    await requireAuth(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireUserHash(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireSiteOwner(ctx, next)
  })

// Routes admin - Invitations
router
  .post('/admin/:hashUser/sites/:hashSite/invitations', [InvitationsController, 'create'])
  .use(async (ctx, next) => {
    await requireAuth(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireUserHash(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireSiteOwner(ctx, next)
  })

router
  .get('/admin/:hashUser/sites/:hashSite/invitations', [InvitationsController, 'index'])
  .use(async (ctx, next) => {
    await requireAuth(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireUserHash(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireSiteOwner(ctx, next)
  })

router
  .delete('/admin/:hashUser/sites/:hashSite/invitations/:invitationId', [InvitationsController, 'destroy'])
  .use(async (ctx, next) => {
    await requireAuth(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireUserHash(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireSiteOwner(ctx, next)
  })

router
  .get('/admin/:hashUser/sites/:hashSite/admins', [InvitationsController, 'listAdmins'])
  .use(async (ctx, next) => {
    await requireAuth(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireUserHash(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireSiteOwner(ctx, next)
  })

router
  .delete('/admin/:hashUser/sites/:hashSite/admins/:adminId', [InvitationsController, 'removeAdmin'])
  .use(async (ctx, next) => {
    await requireAuth(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireUserHash(ctx, next)
  })
  .use(async (ctx, next) => {
    await requireSiteOwner(ctx, next)
  })
