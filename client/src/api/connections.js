import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client.js';

export const CONNECTIONS_KEY = ['connections'];

export const useConnections = (options = {}) =>
  useQuery({ queryKey: CONNECTIONS_KEY, queryFn: () => api.get('/connections').then((r) => r.data), ...options });

export const useConnectionWith = (userId) =>
  useQuery({
    queryKey: ['connection-with', Number(userId)],
    queryFn: () => api.get(`/connections/with/${userId}`).then((r) => r.data.connection),
    enabled: Boolean(userId),
  });

function useInvalidateConnections() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    qc.invalidateQueries({ queryKey: ['connection-with'] });
    qc.invalidateQueries({ queryKey: ['conversations'] });
  };
}

export function useRequestConnection() {
  const invalidate = useInvalidateConnections();
  return useMutation({
    mutationFn: (addresseeId) => api.post('/connections', { addresseeId }).then((r) => r.data.connection),
    onSuccess: invalidate,
  });
}

export function useRespondToConnection() {
  const invalidate = useInvalidateConnections();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/connections/${id}`, { status }).then((r) => r.data.connection),
    onSuccess: invalidate,
  });
}
