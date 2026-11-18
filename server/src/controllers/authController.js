import * as Auth from '../services/authService.js';
import * as Users from '../models/userModel.js';
import { HttpError } from '../middleware/errorHandler.js';

function setSession(res, user) {
  res.cookie(Auth.TOKEN_COOKIE, Auth.signToken(user.id), Auth.cookieOptions);
}

export async function register(req, res) {
  const user = await Auth.register(req.body);
  setSession(res, user);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const user = await Auth.login(req.body);
  setSession(res, user);
  res.json({ user });
}

export function logout(req, res) {
  const { maxAge, ...opts } = Auth.cookieOptions; // eslint-disable-line no-unused-vars
  res.clearCookie(Auth.TOKEN_COOKIE, opts);
  res.status(204).end();
}

export async function me(req, res) {
  const user = await Users.findById(req.userId);
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Please log in');
  res.json({ user });
}
