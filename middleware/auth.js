const { User, Site, SiteAdmin } = require('../src/models');
const { generateUniqueUserHash } = require('../utils/hash');

/**
 * Middleware pour vérifier si l'utilisateur est connecté
 */
function requireAuth(req, res, next) {
  if (req.session.user_id) {
    return next();
  }
  res.redirect("/login");
}

/**
 * Middleware pour vérifier que l'utilisateur correspond au hashUser
 */
function requireUserHash(req, res, next) {
  const hashUser = req.params.hashUser;
  if (!hashUser) {
    return res.status(400).send("Hash utilisateur manquant");
  }
  
  const user = User.findByHash.get(hashUser);
  if (!user) {
    return res.status(404).send("Utilisateur introuvable");
  }
  
  if (user.id !== req.session.user_id) {
    return res.status(403).send("Accès interdit : vous n'êtes pas autorisé à accéder à cette page");
  }
  
  req.user = user;
  req.userHash = hashUser;
  next();
}

/**
 * Middleware pour vérifier que l'utilisateur est propriétaire du site
 */
function requireSiteOwner(req, res, next) {
  const hash = req.params.hash || req.params.hashSite;
  if (!hash) {
    return res.status(400).send("Hash manquant");
  }
  
  const site = Site.findByHash.get(hash);
  if (!site) {
    return res.status(404).send("Site introuvable");
  }
  
  // Vérifier si l'utilisateur est le propriétaire
  if (site.user_id === req.session.user_id) {
    req.site = site;
    req.isOwner = true;
    return next();
  }
  
  // Vérifier si l'utilisateur est un administrateur invité
  const adminCheck = SiteAdmin.isAdmin.get(site.id, req.session.user_id);
  if (adminCheck && adminCheck.count > 0) {
    req.site = site;
    req.isOwner = false;
    return next();
  }
  
  return res.status(403).send("Accès interdit : vous n'êtes pas autorisé à accéder à ce site");
}

/**
 * Fonction pour obtenir l'utilisateur actuel
 */
function getCurrentUser(req) {
  if (!req.session.user_id) {
    return null;
  }
  return User.findById.get(req.session.user_id);
}

/**
 * S'assure qu'un utilisateur a un hash
 */
function ensureUserHash(user) {
  if (!user) {
    return null;
  }
  if (!user.hash) {
    const userHash = generateUniqueUserHash();
    User.updateHash.run(userHash, user.id);
    user.hash = userHash;
  }
  return user.hash;
}

module.exports = {
  requireAuth,
  requireUserHash,
  requireSiteOwner,
  getCurrentUser,
  ensureUserHash
};

