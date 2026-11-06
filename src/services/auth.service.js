import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import { getUserByEmail, getUserById, createUser } from '../db/repository.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// Quita los campos sensibles (nunca se expone el hash).
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

// Registro: crea una cuenta y devuelve { token, user }.
export async function register({ name, email, password }) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    const err = new Error('El nombre es obligatorio.');
    err.status = 400;
    throw err;
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    const err = new Error('El correo no es válido.');
    err.status = 400;
    throw err;
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    const err = new Error('La contraseña debe tener al menos 6 caracteres.');
    err.status = 400;
    throw err;
  }

  const normalized = email.trim().toLowerCase();
  if (getUserByEmail(normalized)) {
    const err = new Error('Ya existe una cuenta con ese correo.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = createUser(name.trim(), normalized, passwordHash);
  return { token: signToken(user), user: publicUser(user) };
}

// Inicio de sesión: valida credenciales y devuelve { token, user }.
export async function login({ email, password }) {
  if (!email || !password) {
    const err = new Error('Correo y contraseña son obligatorios.');
    err.status = 400;
    throw err;
  }

  const user = getUserByEmail(String(email).trim().toLowerCase());
  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
    const err = new Error('Credenciales inválidas.');
    err.status = 401;
    throw err;
  }

  return { token: signToken(user), user: publicUser(user) };
}

// Devuelve el usuario a partir de un token JWT válido (o null).
export function getUserFromToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = getUserById(payload.sub);
    return user || null;
  } catch {
    return null;
  }
}
