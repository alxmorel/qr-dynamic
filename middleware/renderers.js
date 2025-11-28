const { userQueries } = require('../database');

const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
const SHOULD_USE_SECURE_COOKIES = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
const isGoogleAuthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) {
    return {};
  }
  return header.split(";").reduce((acc, pair) => {
    const [key, ...rest] = pair.split("=");
    if (!key) {
      return acc;
    }
    acc[key.trim()] = rest.join("=").trim();
    return acc;
  }, {});
}

function readLastGoogleProfileFromCookie(req) {
  const cookies = parseCookies(req);
  const rawProfile = cookies.lastGoogleProfile;
  if (!rawProfile) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(rawProfile);
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

function getGoogleSuggestedAccount(req) {
  if (req.session?.lastGoogleProfile) {
    return req.session.lastGoogleProfile;
  }
  const cookieProfile = readLastGoogleProfileFromCookie(req);
  if (cookieProfile) {
    return cookieProfile;
  }
}

function persistGoogleProfile(req, res, profile) {
  if (!profile) {
    return;
  }
  const sanitizedProfile = {
    name: profile.name || null,
    email: profile.email || null,
    avatarUrl: profile.avatarUrl || null
  };
  if (req.session) {
    req.session.lastGoogleProfile = sanitizedProfile;
  }
  const cookieValue = encodeURIComponent(JSON.stringify(sanitizedProfile));
  res.cookie("lastGoogleProfile", cookieValue, {
    maxAge: COOKIE_MAX_AGE_MS,
    httpOnly: false,
    sameSite: "lax",
    secure: SHOULD_USE_SECURE_COOKIES
  });
}

function renderLogin(req, res, options = {}) {
  res.render("login", {
    error: null,
    success: null,
    inviteToken: null,
    ...options,
    googleAuthEnabled: isGoogleAuthConfigured,
    googleSuggestedAccount: getGoogleSuggestedAccount(req)
  });
}

function renderRegister(req, res, options = {}) {
  res.render("register", {
    error: null,
    success: null,
    inviteToken: null,
    ...options,
    googleAuthEnabled: isGoogleAuthConfigured,
    googleSuggestedAccount: getGoogleSuggestedAccount(req)
  });
}

module.exports = {
  renderLogin,
  renderRegister,
  persistGoogleProfile,
  getGoogleSuggestedAccount
};

