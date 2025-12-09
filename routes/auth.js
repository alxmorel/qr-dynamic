const express = require('express');
const router = express.Router();
const passport = require('passport');
const { User, PendingRegistration, Invitation, Site, SiteAdmin } = require('../src/models');
const { createUserWithSite, authenticateUser, findOrCreateGoogleUser } = require('../utils/auth');
const { renderLogin, renderRegister, persistGoogleProfile } = require('../middleware/renderers');
const { ensureUserHash } = require('../middleware/auth');
const { isGoogleAuthConfigured } = require('../config/googleAuth');
const InvitationService = require('../src/services/InvitationService');

// Page d'inscription
router.get("/register", (req, res) => {
  if (req.session.user_id) {
    // Si déjà connecté et qu'il y a une invitation, accepter l'invitation
    if (req.query.invite) {
      return res.redirect(`/invite/${req.query.invite}`);
    }
    // Si déjà connecté, rediriger vers la liste des sites
    const user = User.findById.get(req.session.user_id);
    if (user && user.hash) {
      return res.redirect(`/admin/${user.hash}/sites`);
    }
    return res.redirect("/");
  }
  return renderRegister(req, res, { inviteToken: req.query.invite || null });
});

// Traitement de l'inscription
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, confirmPassword, inviteToken } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return renderRegister(req, res, { error: "Tous les champs sont requis", inviteToken: inviteToken || null });
    }
    
    if (password !== confirmPassword) {
      return renderRegister(req, res, { error: "Les mots de passe ne correspondent pas", inviteToken: inviteToken || null });
    }
    
    if (password.length < 6) {
      return renderRegister(req, res, { error: "Le mot de passe doit contenir au moins 6 caractères", inviteToken: inviteToken || null });
    }

    // Vérifier si email ou username déjà utilisés
    const existingEmail = User.findByEmail.get(email);
    if (existingEmail) {
      return renderRegister(req, res, { error: "Cet email est déjà utilisé", inviteToken: inviteToken || null });
    }
    
    const existingUsername = User.findByUsername.get(username);
    if (existingUsername) {
      return renderRegister(req, res, { error: "Ce nom d'utilisateur est déjà utilisé", inviteToken: inviteToken || null });
    }

    // Créer directement l'utilisateur
    const { user } = await createUserWithSite(username, email, password);

    // Connecter automatiquement l'utilisateur
    req.session.user_id = user.id;
    ensureUserHash(user);

    // Si une invitation est présente, l'accepter automatiquement
    if (inviteToken) {
      try {
        InvitationService.acceptInvitation(inviteToken, user.id);
        return res.redirect(`/invite/${inviteToken}`);
      } catch (error) {
        console.error("Erreur lors de l'acceptation de l'invitation après inscription:", error);
        // Continuer même si l'invitation échoue
      }
    }

    // Rediriger vers la liste des sites
    return res.redirect(`/admin/${user.hash}/sites`);
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return renderRegister(req, res, { error: error.message || "Une erreur est survenue lors de la création de votre compte", inviteToken: req.body.inviteToken || null });
  }
});

// Vérification de l'email et création effective du compte
router.get("/verify-email/:token", async (req, res) => {
  const token = req.params.token;
  try {
    PendingRegistration.deleteExpired.run();

    const pendingRegistration = PendingRegistration.findByToken.get(token);

    if (!pendingRegistration) {
      return res.render("verify-email", {
        success: false,
        title: "Lien invalide",
        message: "Ce lien de vérification est invalide ou a déjà été utilisé."
      });
    }

    const now = new Date();
    const expiresAt = new Date(pendingRegistration.expires_at);
    if (now > expiresAt) {
      PendingRegistration.deleteById.run(pendingRegistration.id);
      return res.render("verify-email", {
        success: false,
        title: "Lien expiré",
        message: "Ce lien de vérification a expiré. Recommencez l'inscription pour recevoir un nouveau lien."
      });
    }

    // Créer l'utilisateur définitivement
    const { user } = await createUserWithSite(
      pendingRegistration.username,
      pendingRegistration.email,
      null,
      { passwordHashOverride: pendingRegistration.password_hash }
    );

    // Nettoyer l'inscription en attente
    PendingRegistration.deleteById.run(pendingRegistration.id);

    // Connecter automatiquement l'utilisateur
    req.session.user_id = user.id;

    // S'il y avait une invitation, répéter la logique d'acceptation automatique
    if (pendingRegistration.invite_token) {
      try {
        const invitation = Invitation.findByToken.get(pendingRegistration.invite_token);
        if (invitation && !invitation.used) {
          const expiresAtInvite = new Date(invitation.expires_at);
          if (now <= expiresAtInvite) {
            const siteInvited = Site.findById.get(invitation.site_id);
            if (siteInvited) {
              if (siteInvited.user_id === user.id) {
                return res.redirect(`/invite/${pendingRegistration.invite_token}`);
              }

              const adminCheck = SiteAdmin.isAdmin.get(siteInvited.id, user.id);
              if (adminCheck && adminCheck.count > 0) {
                return res.redirect(`/invite/${pendingRegistration.invite_token}`);
              }

              SiteAdmin.create.run(siteInvited.id, user.id);
              Invitation.markAsUsed.run(user.id, pendingRegistration.invite_token);
              return res.redirect(`/invite/${pendingRegistration.invite_token}`);
            }
          }
        }
      } catch (error) {
        console.error("Erreur lors de l'acceptation de l'invitation après vérification d'email:", error);
      }
    }

    return res.redirect(`/admin/${user.hash}/sites`);
  } catch (error) {
    console.error("Erreur lors de la vérification d'email:", error);
    return res.render("verify-email", {
      success: false,
      title: "Erreur inattendue",
      message: "Une erreur est survenue lors de la vérification de votre email. Veuillez réessayer."
    });
  }
});

// Page de connexion
router.get("/login", (req, res) => {
  if (req.session.user_id) {
    // Si déjà connecté et qu'il y a une invitation, accepter l'invitation
    if (req.query.invite) {
      return res.redirect(`/invite/${req.query.invite}`);
    }
    // Si déjà connecté, rediriger vers la liste des sites
    const user = User.findById.get(req.session.user_id);
    if (user && user.hash) {
      return res.redirect(`/admin/${user.hash}/sites`);
    }
    return res.redirect("/");
  }
  return renderLogin(req, res, { success: req.query.success || null, inviteToken: req.query.invite || null });
});

// Traitement de la connexion
router.post("/login", async (req, res) => {
  try {
    const { identifier, password, inviteToken } = req.body;
    
    if (!identifier || !password) {
      return renderLogin(req, res, { error: "Email/username et mot de passe requis", inviteToken: inviteToken || null });
    }
    
    const user = await authenticateUser(identifier, password);
    
    if (!user) {
      return renderLogin(req, res, { error: "Identifiants incorrects", inviteToken: inviteToken || null });
    }
    
    // Créer la session
    req.session.user_id = user.id;
    
    ensureUserHash(user);
    
    // Si une invitation est présente, rediriger vers l'acceptation
    if (inviteToken) {
      return res.redirect(`/invite/${inviteToken}`);
    }
    
    // Rediriger vers la liste des sites
    res.redirect(`/admin/${user.hash}/sites`);
  } catch (error) {
    return renderLogin(req, res, { error: "Une erreur est survenue lors de la connexion", inviteToken: req.body.inviteToken || null });
  }
});

// Route Google OAuth
router.get("/auth/google", (req, res, next) => {
  if (!isGoogleAuthConfigured()) {
    return res.status(503).send("La connexion Google n'est pas disponible.");
  }
  if (req.query.inviteToken) {
    req.session.pendingInviteToken = req.query.inviteToken;
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })(req, res, next);
});

router.get("/auth/google/callback",
  (req, res, next) => {
    if (!isGoogleAuthConfigured()) {
      return res.redirect("/login?error=google");
    }
    next();
  },
  passport.authenticate("google", { failureRedirect: "/login?error=google" }),
  (req, res) => {
    if (req.user) {
      req.session.user_id = req.user.id;
    }
    if (req._lastGoogleProfile) {
      persistGoogleProfile(req, res, req._lastGoogleProfile);
    }
    const inviteToken = req.session.pendingInviteToken;
    delete req.session.pendingInviteToken;
    const userHash = ensureUserHash(req.user);
    if (inviteToken) {
      return res.redirect(`/invite/${inviteToken}`);
    }
    if (userHash) {
      return res.redirect(`/admin/${userHash}/sites`);
    }
    return res.redirect("/");
  }
);

// Déconnexion
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erreur lors de la déconnexion:", err);
    }
    res.redirect("/");
  });
});

module.exports = router;

