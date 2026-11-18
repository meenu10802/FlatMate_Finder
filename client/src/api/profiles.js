import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client.js';
import { ME_KEY } from '../context/AuthContext.jsx';

export const fetchMyProfile = () => api.get('/profiles/me').then((r) => r.data.profile);
export const fetchProfile = (userId) => api.get(`/profiles/${userId}`).then((r) => r.data.profile);
export const saveMyProfile = (body) => api.put('/profiles/me', body).then((r) => r.data.profile);

export const useMyProfile = () => useQuery({ queryKey: ['profile', 'me'], queryFn: fetchMyProfile });

export const useProfile = (userId) =>
  useQuery({ queryKey: ['profile', Number(userId)], queryFn: () => fetchProfile(userId), enabled: Boolean(userId) });

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveMyProfile,
    onSuccess: (profile) => {
      qc.setQueryData(['profile', 'me'], profile);
      qc.setQueryData(ME_KEY, (u) => (u ? { ...u, hasProfile: true } : u));
    },
  });
}
