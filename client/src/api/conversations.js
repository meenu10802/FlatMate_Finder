import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from './client.js';

export const CONVERSATIONS_KEY = ['conversations'];
export const messagesKey = (connectionId) => ['messages', Number(connectionId)];

export const useConversations = (options = {}) =>
  useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => api.get('/conversations').then((r) => r.data.conversations),
    ...options,
  });

/**
 * Message history as an infinite query. pages[0] is the NEWEST page; each page's messages are oldest → newest.
 * Real-time messages are appended to pages[0] by SocketContext.
 */
export const useMessages = (connectionId) =>
  useInfiniteQuery({
    queryKey: messagesKey(connectionId),
    queryFn: ({ pageParam }) =>
      api
        .get(`/conversations/${connectionId}/messages`, { params: { limit: 50, before: pageParam } })
        .then((r) => r.data),
    initialPageParam: undefined,
    getNextPageParam: (last) => (last.hasMore && last.messages.length ? last.messages[0].id : undefined),
    enabled: Boolean(connectionId),
    staleTime: Infinity, // kept fresh by socket events; refetched on reconnect
  });

export const postMessage = (connectionId, body) =>
  api.post(`/conversations/${connectionId}/messages`, { body }).then((r) => r.data.message);

export const markReadRest = (connectionId) => api.post(`/conversations/${connectionId}/read`).then((r) => r.data);

/** Flatten infinite pages into one oldest → newest list. */
export const flattenMessages = (data) => (data ? [...data.pages].reverse().flatMap((p) => p.messages) : []);
