import { getUserFromToken } from '../services/auth.service.js';

// Middleware: exige un token JWT válido en "Authorization: Bearer <token>".
// En caso de éxito deja el usuario en `req.user`.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Se requiere autenticación.' });
  }

  const user = getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }

  req.user = user;
  next();
}
