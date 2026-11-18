import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Normalize server error shape { error: { code, message, details } }.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const e = err.response?.data?.error;
    return Promise.reject(Object.assign(new Error(e?.message || err.message), { code: e?.code, details: e?.details, status: err.response?.status }));
  }
);
