/**
 * Convertir les URLs YouTube en format embed
 */
function convertYouTubeUrl(url) {
  if (!url) return url;
  
  // Si c'est déjà une URL embed, la retourner telle quelle
  if (url.includes('youtube.com/embed/')) {
    return url;
  }
  
  // Extraire l'ID de la vidéo depuis différentes formats d'URL YouTube
  let videoId = null;
  
  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }
  
  // Format: https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }
  
  // Format: https://www.youtube.com/embed/VIDEO_ID (déjà en embed)
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&]+)/);
  if (embedMatch) {
    return url;
  }
  
  // Si on a trouvé un ID, créer l'URL embed
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  // Sinon, retourner l'URL originale
  return url;
}

/**
 * Convertir les URLs Spotify en format embed
 */
function convertSpotifyUrl(url) {
  if (!url) return url;
  
  // Si c'est déjà une URL embed, la retourner telle quelle
  if (url.includes('open.spotify.com/embed/')) {
    return url;
  }
  
  // Extraire le type (album, playlist, track) et l'ID depuis l'URL Spotify
  // Format: https://open.spotify.com/album/ID ou https://open.spotify.com/intl-fr/album/ID?si=...
  // Format: https://open.spotify.com/playlist/ID ou https://open.spotify.com/intl-fr/playlist/ID?si=...
  // Format: https://open.spotify.com/track/ID ou https://open.spotify.com/intl-fr/track/ID?si=...
  
  const spotifyMatch = url.match(/open\.spotify\.com\/(?:intl-[^\/]+\/)?(album|playlist|track)\/([^?&]+)/);
  if (spotifyMatch) {
    const type = spotifyMatch[1]; // album, playlist, ou track
    const id = spotifyMatch[2]; // ID de l'album/playlist/track
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`;
  }
  
  // Sinon, retourner l'URL originale
  return url;
}

module.exports = {
  convertYouTubeUrl,
  convertSpotifyUrl
};

