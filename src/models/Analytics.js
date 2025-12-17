/**
 * Modèle Analytics - Gestion des statistiques des sites
 */

const db = require('./database');

const Analytics = {
  /**
   * Enregistrer une nouvelle visite
   */
  createVisit: db.prepare(`
    INSERT INTO site_visits (site_id, session_id, ip_address, user_agent, referrer, device_type, browser, os)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  /**
   * Mettre à jour une visite (fin de session)
   */
  updateVisit: db.prepare(`
    UPDATE site_visits 
    SET ended_at = CURRENT_TIMESTAMP,
        duration_seconds = ?,
        page_views = ?,
        is_bounce = ?
    WHERE session_id = ? AND site_id = ?
  `),

  /**
   * Trouver une visite par session_id
   */
  findBySession: db.prepare(`
    SELECT * FROM site_visits WHERE session_id = ? AND site_id = ? ORDER BY started_at DESC LIMIT 1
  `),

  /**
   * Enregistrer un événement
   */
  createEvent: db.prepare(`
    INSERT INTO site_events (site_id, session_id, event_type, event_data)
    VALUES (?, ?, ?, ?)
  `),

  /**
   * Obtenir les statistiques d'un site
   */
  getSiteStats: db.prepare(`
    SELECT 
      COUNT(DISTINCT session_id) as total_visits,
      COUNT(*) as total_sessions,
      AVG(duration_seconds) as avg_duration,
      SUM(CASE WHEN is_bounce = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) as bounce_rate,
      COUNT(DISTINCT CASE WHEN ended_at IS NOT NULL THEN session_id END) * 100.0 / NULLIF(COUNT(DISTINCT session_id), 0) as retention_rate
    FROM site_visits
    WHERE site_id = ?
  `),

  /**
   * Obtenir le nombre de clics CTA
   */
  getCtaClicks: db.prepare(`
    SELECT COUNT(*) as total_clicks
    FROM site_events
    WHERE site_id = ? AND event_type = 'cta_click'
  `),

  /**
   * Obtenir les visites récentes
   */
  getRecentVisits: db.prepare(`
    SELECT * FROM site_visits
    WHERE site_id = ?
    ORDER BY started_at DESC
    LIMIT ?
  `),

  /**
   * Obtenir les statistiques par navigateur
   */
  getStatsByBrowser: db.prepare(`
    SELECT 
      browser,
      COUNT(DISTINCT session_id) as visits,
      AVG(duration_seconds) as avg_duration
    FROM site_visits
    WHERE site_id = ? AND browser IS NOT NULL
    GROUP BY browser
    ORDER BY visits DESC
  `),

  /**
   * Obtenir les statistiques par type d'appareil
   */
  getStatsByDevice: db.prepare(`
    SELECT 
      device_type,
      COUNT(DISTINCT session_id) as visits,
      AVG(duration_seconds) as avg_duration
    FROM site_visits
    WHERE site_id = ? AND device_type IS NOT NULL
    GROUP BY device_type
    ORDER BY visits DESC
  `),

  /**
   * Obtenir les visiteurs uniques vs retours
   * Un visiteur unique = une IP qui n'apparaît qu'une fois
   * Un visiteur récurrent = une IP qui apparaît plusieurs fois
   */
  getUniqueVsReturning: db.prepare(`
    WITH ip_counts AS (
      SELECT 
        ip_address,
        COUNT(DISTINCT session_id) as session_count
      FROM site_visits
      WHERE site_id = ? AND ip_address IS NOT NULL
      GROUP BY ip_address
    )
    SELECT 
      COUNT(CASE WHEN session_count = 1 THEN 1 END) as unique_visitors,
      COUNT(CASE WHEN session_count > 1 THEN 1 END) as returning_visitors
    FROM ip_counts
  `),

  /**
   * Obtenir les visites par jour (pour graphique temporel)
   */
  getVisitsByDay: db.prepare(`
    SELECT 
      DATE(started_at) as date,
      COUNT(DISTINCT session_id) as visits
    FROM site_visits
    WHERE site_id = ? AND started_at >= date('now', '-30 days')
    GROUP BY DATE(started_at)
    ORDER BY date ASC
  `),

  /**
   * Obtenir les visites par heure (pour graphique heures de pointe)
   */
  getVisitsByHour: db.prepare(`
    SELECT 
      CAST(strftime('%H', started_at) AS INTEGER) as hour,
      COUNT(DISTINCT session_id) as visits
    FROM site_visits
    WHERE site_id = ?
    GROUP BY hour
    ORDER BY hour ASC
  `),

  /**
   * Obtenir les sources de trafic (referrer)
   */
  getTrafficSources: db.prepare(`
    SELECT 
      CASE 
        WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
        WHEN referrer LIKE '%google%' OR referrer LIKE '%bing%' OR referrer LIKE '%yahoo%' THEN 'Moteur de recherche'
        WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%instagram%' OR referrer LIKE '%linkedin%' THEN 'Réseaux sociaux'
        ELSE 'Autre site'
      END as source,
      COUNT(DISTINCT session_id) as visits
    FROM site_visits
    WHERE site_id = ?
    GROUP BY source
    ORDER BY visits DESC
  `),

  /**
   * Obtenir les statistiques de la période précédente (pour tendances)
   */
  getPreviousPeriodStats: db.prepare(`
    SELECT 
      COUNT(DISTINCT session_id) as total_visits,
      AVG(duration_seconds) as avg_duration,
      SUM(CASE WHEN is_bounce = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) as bounce_rate
    FROM site_visits
    WHERE site_id = ? 
      AND started_at >= date('now', '-60 days')
      AND started_at < date('now', '-30 days')
  `)
};

/**
 * Fonctions helper pour gérer les périodes
 */
// Helper pour construire les conditions WHERE avec filtres
function buildFilterConditions(filters) {
  const conditions = [];
  const params = [];
  
  if (filters && filters.hour !== undefined && filters.hour !== null) {
    conditions.push("CAST(strftime('%H', started_at) AS INTEGER) = ?");
    params.push(filters.hour);
  }
  if (filters && filters.date) {
    conditions.push("DATE(started_at) = ?");
    params.push(filters.date);
  }
  if (filters && filters.source) {
    conditions.push(`(CASE 
      WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
      WHEN referrer LIKE '%google%' OR referrer LIKE '%bing%' OR referrer LIKE '%yahoo%' THEN 'Moteur de recherche'
      WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%instagram%' OR referrer LIKE '%linkedin%' THEN 'Réseaux sociaux'
      ELSE 'Autre site'
    END) = ?`);
    params.push(filters.source);
  }
  if (filters && filters.browser) {
    conditions.push('browser = ?');
    params.push(filters.browser);
  }
  if (filters && filters.device) {
    conditions.push('device_type = ?');
    params.push(filters.device);
  }
  
  return { conditions, params };
}

Analytics.getSiteStatsWithPeriod = (siteId, startDate, endDate, filters = {}) => {
  // Ajouter l'heure pour inclure toute la journée
  const startDateTime = startDate + ' 00:00:00';
  const endDateTime = endDate + ' 23:59:59';
  
  const { conditions, params } = buildFilterConditions(filters);
  const filterClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
  
  const query = `
    SELECT 
      COUNT(DISTINCT session_id) as total_visits,
      COUNT(*) as total_sessions,
      AVG(duration_seconds) as avg_duration,
      SUM(CASE WHEN is_bounce = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) as bounce_rate,
      COUNT(DISTINCT CASE WHEN ended_at IS NOT NULL THEN session_id END) * 100.0 / NULLIF(COUNT(DISTINCT session_id), 0) as retention_rate
    FROM site_visits
    WHERE site_id = ? AND started_at >= ? AND started_at <= ?${filterClause}
  `;
  return db.prepare(query).get(siteId, startDateTime, endDateTime, ...params);
};

Analytics.getCtaClicksWithPeriod = (siteId, startDate, endDate, filters = {}) => {
  const startDateTime = startDate + ' 00:00:00';
  const endDateTime = endDate + ' 23:59:59';
  
  const { conditions, params } = buildFilterConditions(filters);
  const filterClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
  
  const query = `
    SELECT COUNT(*) as total_clicks
    FROM site_events se
    INNER JOIN site_visits sv ON se.session_id = sv.session_id AND se.site_id = sv.site_id
    WHERE se.site_id = ? AND se.event_type = 'cta_click'
      AND sv.started_at >= ? AND sv.started_at <= ?${filterClause}
  `;
  return db.prepare(query).get(siteId, startDateTime, endDateTime, ...params);
};

Analytics.getStatsByBrowserWithPeriod = (siteId, startDate, endDate, filters = {}) => {
  const startDateTime = startDate + ' 00:00:00';
  const endDateTime = endDate + ' 23:59:59';
  
  const { conditions, params } = buildFilterConditions(filters);
  const filterClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
  
  const query = `
    SELECT 
      browser,
      COUNT(DISTINCT session_id) as visits,
      AVG(duration_seconds) as avg_duration
    FROM site_visits
    WHERE site_id = ? AND browser IS NOT NULL
      AND started_at >= ? AND started_at <= ?${filterClause}
    GROUP BY browser
    ORDER BY visits DESC
  `;
  return db.prepare(query).all(siteId, startDateTime, endDateTime, ...params);
};

Analytics.getStatsByDeviceWithPeriod = (siteId, startDate, endDate, filters = {}) => {
  const startDateTime = startDate + ' 00:00:00';
  const endDateTime = endDate + ' 23:59:59';
  
  const { conditions, params } = buildFilterConditions(filters);
  const filterClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
  
  const query = `
    SELECT 
      device_type,
      COUNT(DISTINCT session_id) as visits,
      AVG(duration_seconds) as avg_duration
    FROM site_visits
    WHERE site_id = ? AND device_type IS NOT NULL
      AND started_at >= ? AND started_at <= ?${filterClause}
    GROUP BY device_type
    ORDER BY visits DESC
  `;
  return db.prepare(query).all(siteId, startDateTime, endDateTime, ...params);
};

Analytics.getUniqueVsReturningWithPeriod = (siteId, startDate, endDate, filters = {}) => {
  const startDateTime = startDate + ' 00:00:00';
  const endDateTime = endDate + ' 23:59:59';
  
  const { conditions, params } = buildFilterConditions(filters);
  const filterClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
  
  const query = `
    WITH ip_counts AS (
      SELECT 
        ip_address,
        COUNT(DISTINCT session_id) as session_count
      FROM site_visits
      WHERE site_id = ? AND ip_address IS NOT NULL
        AND started_at >= ? AND started_at <= ?${filterClause}
      GROUP BY ip_address
    )
    SELECT 
      COUNT(CASE WHEN session_count = 1 THEN 1 END) as unique_visitors,
      COUNT(CASE WHEN session_count > 1 THEN 1 END) as returning_visitors
    FROM ip_counts
  `;
  return db.prepare(query).get(siteId, startDateTime, endDateTime, ...params);
};

Analytics.getVisitsByDayWithPeriod = (siteId, startDate, endDate, filters = {}) => {
  const startDateTime = startDate + ' 00:00:00';
  const endDateTime = endDate + ' 23:59:59';
  
  const { conditions, params } = buildFilterConditions(filters);
  const filterClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
  
  const query = `
    SELECT 
      DATE(started_at) as date,
      COUNT(DISTINCT session_id) as visits
    FROM site_visits
    WHERE site_id = ? AND started_at >= ? AND started_at <= ?${filterClause}
    GROUP BY DATE(started_at)
    ORDER BY date ASC
  `;
  return db.prepare(query).all(siteId, startDateTime, endDateTime, ...params);
};

Analytics.getVisitsByHourWithPeriod = (siteId, startDate, endDate, filters = {}) => {
  const startDateTime = startDate + ' 00:00:00';
  const endDateTime = endDate + ' 23:59:59';
  
  // Ne pas filtrer par heure si c'est déjà le filtre actif (sinon on n'aurait qu'une seule barre)
  const filterHour = filters.hour;
  const filtersWithoutHour = { ...filters };
  delete filtersWithoutHour.hour;
  
  const { conditions, params } = buildFilterConditions(filtersWithoutHour);
  const filterClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
  
  const query = `
    SELECT 
      CAST(strftime('%H', started_at) AS INTEGER) as hour,
      COUNT(DISTINCT session_id) as visits
    FROM site_visits
    WHERE site_id = ? AND started_at >= ? AND started_at <= ?${filterClause}
    GROUP BY hour
    ORDER BY hour ASC
  `;
  return db.prepare(query).all(siteId, startDateTime, endDateTime, ...params);
};

Analytics.getTrafficSourcesWithPeriod = (siteId, startDate, endDate, filters = {}) => {
  const startDateTime = startDate + ' 00:00:00';
  const endDateTime = endDate + ' 23:59:59';
  
  // Ne pas filtrer par source si c'est déjà le filtre actif
  const filtersWithoutSource = { ...filters };
  delete filtersWithoutSource.source;
  
  const { conditions, params } = buildFilterConditions(filtersWithoutSource);
  const filterClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
  
  const query = `
    SELECT 
      CASE 
        WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
        WHEN referrer LIKE '%google%' OR referrer LIKE '%bing%' OR referrer LIKE '%yahoo%' THEN 'Moteur de recherche'
        WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%instagram%' OR referrer LIKE '%linkedin%' THEN 'Réseaux sociaux'
        ELSE 'Autre site'
      END as source,
      COUNT(DISTINCT session_id) as visits
    FROM site_visits
    WHERE site_id = ? AND started_at >= ? AND started_at <= ?${filterClause}
    GROUP BY source
    ORDER BY visits DESC
  `;
  return db.prepare(query).all(siteId, startDateTime, endDateTime, ...params);
};

Analytics.getPreviousPeriodStatsForComparison = (siteId, currentStart, currentEnd) => {
  // Calculer la période précédente de même durée
  const currentStartDate = new Date(currentStart);
  const currentEndDate = new Date(currentEnd);
  const currentDuration = Math.ceil((currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24)); // jours
  
  // La période précédente se termine juste avant la période actuelle
  const previousEnd = new Date(currentStartDate);
  previousEnd.setDate(previousEnd.getDate() - 1);
  
  // La période précédente commence à la même durée avant sa fin
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - currentDuration + 1);
  
  const previousStartStr = previousStart.toISOString().split('T')[0] + ' 00:00:00';
  const previousEndStr = previousEnd.toISOString().split('T')[0] + ' 23:59:59';
  
  const query = `
    SELECT 
      COUNT(DISTINCT session_id) as total_visits,
      AVG(duration_seconds) as avg_duration,
      SUM(CASE WHEN is_bounce = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) as bounce_rate
    FROM site_visits
    WHERE site_id = ? 
      AND started_at >= ? AND started_at <= ?
  `;
  return db.prepare(query).get(siteId, previousStartStr, previousEndStr);
};

module.exports = Analytics;

