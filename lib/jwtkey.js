// Signing key for login cookies (shared by lib/auth.js and lib/db.js).
export const jwtKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set to a random string of at least 32 characters.');
    return new TextEncoder().encode(secret || 'dev-only-secret-do-not-use-in-production');
  }
  return new TextEncoder().encode(secret);
};
