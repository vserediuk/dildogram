/**
 * Strip excessive combining Unicode characters (Zalgo text) from a string.
 * Allows up to 2 combining marks per base character to preserve
 * legitimate diacritics while preventing layout-breaking Zalgo.
 */
export function sanitizeText(text) {
  if (!text) return text;
  // Remove excessive combining diacritical marks (Unicode categories Mn, Me, Mc)
  // Keep at most 2 combining marks after each base character
  return text.replace(/(\P{M})(\p{M}+)/gu, (match, base, marks) => {
    return base + [...marks].slice(0, 2).join("");
  });
}

/**
 * Resolve a relative media path (e.g. /uploads/avatars/img.jpg)
 * to an absolute URL when the app is deployed on a separate domain.
 */
export function mediaUrl(path) {
  if (!path) return null;
  // Already absolute
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const apiBase = import.meta.env.VITE_API_URL;
  if (apiBase) {
    // VITE_API_URL is like "https://myapp-backend.onrender.com/api"
    // Strip trailing "/api" to get the origin
    const origin = apiBase.replace(/\/api\/?$/, "");
    return `${origin}${path}`;
  }
  // Local dev — just return the relative path (nginx/vite proxy handles it)
  return path;
}
