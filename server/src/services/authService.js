import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import * as Users from '../models/userModel.js';
import { HttpError } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 12;
export const TOKEN_COOKIE = 'token';
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

// Pre-computed hash used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', SALT_ROUNDS);

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  maxAge: TOKEN_TTL_SECONDS * 1000,
  path: '/',
};

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: TOKEN_TTL_SECONDS });
}

/** Returns the user id from a token, or null if invalid/expired. Also used by the socket handshake. */
export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return Number(payload.sub) || null;
  } catch {
    return null;
  }
}

export async function register({ name, email, password }) {
  if (await Users.findByEmailWithHash(email)) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    return await Users.create({ email, name, passwordHash });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }
    throw err;
  }
}

export async function login({ email, password }) {
  const user = await Users.findByEmailWithHash(email);
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  return Users.findById(user.id);
}
