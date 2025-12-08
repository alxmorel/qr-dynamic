/**
 * Configuration de la connexion à la base de données SQLite
 * Ce fichier gère uniquement la connexion et l'initialisation de base
 */

const Database = require('better-sqlite3');
const path = require('path');

// Chemin vers la base de données
const dbPath = path.join(__dirname, '../../database.db');
const db = new Database(dbPath);

// Activer les clés étrangères
db.pragma('foreign_keys = ON');

module.exports = db;

