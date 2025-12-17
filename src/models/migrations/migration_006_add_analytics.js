/**
 * Migration 006 - Ajout des tables d'analytics
 * Suivi des visites, événements et statistiques des sites
 */

module.exports = {
  up: (db) => {
    // Table pour les visites (sessions)
    db.exec(`
      CREATE TABLE IF NOT EXISTS site_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        referrer TEXT,
        device_type TEXT,
        browser TEXT,
        os TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        duration_seconds INTEGER,
        page_views INTEGER DEFAULT 1,
        is_bounce INTEGER DEFAULT 0,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `);

    // Table pour les événements (clics CTA, interactions)
    db.exec(`
      CREATE TABLE IF NOT EXISTS site_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `);

    // Index pour améliorer les performances
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_site_visits_site_id ON site_visits(site_id);
      CREATE INDEX IF NOT EXISTS idx_site_visits_session_id ON site_visits(session_id);
      CREATE INDEX IF NOT EXISTS idx_site_visits_started_at ON site_visits(started_at);
      CREATE INDEX IF NOT EXISTS idx_site_events_site_id ON site_events(site_id);
      CREATE INDEX IF NOT EXISTS idx_site_events_session_id ON site_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_site_events_event_type ON site_events(event_type);
    `);
  }
};

