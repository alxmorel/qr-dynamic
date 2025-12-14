/**
 * Point d'entrée pour tous les modèles
 * Exporte tous les modèles et la connexion à la base de données
 */

const db = require('./database');

// Exécuter les migrations AVANT de charger les modèles
// pour s'assurer que toutes les colonnes existent
const { runAllMigrations } = require('./migrations/migrationRunner');
runAllMigrations();

// Charger les modèles après les migrations
const User = require('./User');
const Site = require('./Site');
const Content = require('./Content');
const Invitation = require('./Invitation');
const SiteAdmin = require('./SiteAdmin');
const PendingRegistration = require('./PendingRegistration');
const Template = require('./Template');

module.exports = {
  db,
  User,
  Site,
  Content,
  Invitation,
  SiteAdmin,
  PendingRegistration,
  Template,
  // Exports de compatibilité avec l'ancien système
  userQueries: User,
  siteQueries: Site,
  contentQueries: Content,
  invitationQueries: Invitation,
  siteAdminQueries: SiteAdmin,
  pendingRegistrationQueries: PendingRegistration,
  templateQueries: Template
};

