import { api } from './client.js';

export const fetchMe = () =>
  api.get('/auth/me').then((r) => r.data.user).catch((err) => {
    if (err.status === 401) return null; // not logged in is a normal state
    throw err;
  });

export const login = (body) => api.post('/auth/login', body).then((r) => r.data.user);
export const register = (body) => api.post('/auth/register', body).then((r) => r.data.user);
export const logout = () => api.post('/auth/logout');
