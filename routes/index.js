const express = require('express');
const router = express.Router();
const { userQueries } = require('../database');
const { getCurrentUser } = require('../middleware/auth');

// Page d'accueil
router.get("/", (req, res) => {
  // Si l'utilisateur est connecté, rediriger vers sa liste de sites
  if (req.session.user_id) {
    const user = userQueries.findById.get(req.session.user_id);
    if (user && user.hash) {
      return res.redirect(`/admin/${user.hash}/sites`);
    }
  }
  // Sinon, afficher la page d'accueil avec liens vers login/register
  res.render("home", { user: getCurrentUser(req) });
});

module.exports = router;

