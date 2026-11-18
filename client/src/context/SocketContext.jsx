import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { CONVERSATIONS_KEY, markReadRest, messagesKey, postMessage } from '../api/conversations.js';
import { CONNECTIONS_KEY } from '../api/connections.js';

export const SocketContext = createContext(null);

let tempSeq = 0;

/** Insert a message into the infinite-query cache: dedupe by id, or replace the matching optimistic temp. */
function upsertMessage(data, message) {
  if (!data) return data;
  const pages = data.pages.map((p) => ({ ...p, messages: [...p.messages] }));
  for (const p of pages) if (p.messages.some((m) => m.id === message.id)) return data;
  const newest = pages[0];
  const tempIdx = newest.messages.findIndex((m) => m.pending && m.senderId === message.senderId && m.body === message.body);
  if (tempIdx >= 0) newest.messages[tempIdx] = message;
  else newest.messages.push(message);
  return { ...data, pages };
}

const patchMessages = (data, fn) =>
  data && { ...data, pages: data.pages.map((p) => ({ ...p, messages: p.messages.map(fn) })) };

/**
 * One socket per logged-in tab. Exposes presence, typing, and send/markRead helpers,
 * and keeps the TanStack Query caches (conversations + messages) in sync with server events.
 */
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const socketRef = useRef(null);
  const activeThreadRef = useRef(null);
  const typingTimers = useRef({});
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(() => new Set());
  const [typing, setTyping] = useState({}); // connectionId → true

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return undefined;
    const socket = io({ withCredentials: true, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const updateThread = (connectionId, fn) =>
      qc.setQueryData(CONVERSATIONS_KEY, (list) => {
        if (!list) return list;
        const idx = list.findIndex((t) => t.connectionId === connectionId);
        if (idx < 0) {
          qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
          return list;
        }
        const updated = fn(list[idx]);
        return [updated, ...list.filter((_, i) => i !== idx)].sort((a, b) =>
          (b.lastMessage?.createdAt ?? b.connectedAt).localeCompare(a.lastMessage?.createdAt ?? a.connectedAt)
        );
      });

    socket.on('connect', () => {
      setConnected(true);
      // Catch up on anything missed while disconnected.
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      qc.invalidateQueries({ queryKey: ['messages'] });
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence:list', (ids) => setOnline(new Set(ids)));
    socket.on('presence:update', ({ userId: id, online: isOn }) =>
      setOnline((prev) => {
        const next = new Set(prev);
        if (isOn) next.add(id);
        else next.delete(id);
        return next;
      })
    );

    socket.on('message:new', (m) => {
      qc.setQueryData(messagesKey(m.connectionId), (d) => upsertMessage(d, m));
      const mine = m.senderId === userId;
      const viewing = activeThreadRef.current === m.connectionId && document.visibilityState === 'visible';
      updateThread(m.connectionId, (t) => ({ ...t, lastMessage: m, unread: mine || viewing ? t.unread : t.unread + 1 }));
      if (!mine) {
        setTyping((prev) => ({ ...prev, [m.connectionId]: false }));
        if (viewing) socket.emit('message:read', { connectionId: m.connectionId });
      }
    });

    socket.on('message:read', ({ connectionId, readerId, readAt }) => {
      if (readerId === userId) {
        // I read it (maybe in another tab): clear my badge.
        updateThread(connectionId, (t) => ({ ...t, unread: 0 }));
      } else {
        // They read my messages: show "Seen".
        qc.setQueryData(messagesKey(connectionId), (d) =>
          patchMessages(d, (m) => (m.senderId === userId && !m.readAt && !m.pending ? { ...m, readAt } : m))
        );
        updateThread(connectionId, (t) =>
          t.lastMessage?.senderId === userId ? { ...t, lastMessage: { ...t.lastMessage, readAt } } : t
        );
      }
    });

    socket.on('typing', ({ connectionId, isTyping }) => {
      clearTimeout(typingTimers.current[connectionId]);
      setTyping((prev) => ({ ...prev, [connectionId]: isTyping }));
      if (isTyping) {
        // Safety net in case the "stopped typing" event never arrives.
        typingTimers.current[connectionId] = setTimeout(() => setTyping((prev) => ({ ...prev, [connectionId]: false })), 5000);
      }
    });

    socket.on('connection:update', () => {
      qc.invalidateQueries({ queryKey: CONNECTIONS_KEY });
      qc.invalidateQueries({ queryKey: ['connection-with'] });
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    });

    return () => {
      Object.values(typingTimers.current).forEach(clearTimeout);
      socket.removeAllListeners();
      socket.close();
      socketRef.current = null;
      setConnected(false);
      setOnline(new Set());
      setTyping({});
    };
  }, [userId, qc]);

  /** Optimistic send: show a pending bubble now, confirm via ack (socket) or REST fallback. */
  const sendMessage = useCallback(
    async (connectionId, body) => {
      const temp = { id: `temp-${++tempSeq}`, connectionId, senderId: userId, body, createdAt: new Date().toISOString(), readAt: null, pending: true };
      qc.setQueryData(messagesKey(connectionId), (d) => d && { ...d, pages: [{ ...d.pages[0], messages: [...d.pages[0].messages, temp] }, ...d.pages.slice(1)] });

      const fail = (message) => {
        qc.setQueryData(messagesKey(connectionId), (d) => patchMessages(d, (m) => (m.id === temp.id ? { ...m, pending: false, failed: true, error: message } : m)));
      };

      const socket = socketRef.current;
      try {
        let saved;
        if (socket?.connected) {
          const res = await socket.timeout(8000).emitWithAck('message:send', { connectionId, body });
          if (!res.ok) return fail(res.error.message);
          saved = res.data;
        } else {
          saved = await postMessage(connectionId, body);
        }
        qc.setQueryData(messagesKey(connectionId), (d) => {
          const withoutTemp = patchMessages(d, (m) => m);
          if (!withoutTemp) return withoutTemp;
          const already = withoutTemp.pages.some((p) => p.messages.some((m) => m.id === saved.id));
          return {
            ...withoutTemp,
            pages: withoutTemp.pages.map((p) => ({
              ...p,
              messages: already ? p.messages.filter((m) => m.id !== temp.id) : p.messages.map((m) => (m.id === temp.id ? saved : m)),
            })),
          };
        });
      } catch {
        fail('Couldn’t send — check your connection');
      }
    },
    [qc, userId]
  );

  const discardFailed = useCallback(
    (connectionId, tempId) =>
      qc.setQueryData(messagesKey(connectionId), (d) =>
        d && { ...d, pages: d.pages.map((p) => ({ ...p, messages: p.messages.filter((m) => m.id !== tempId) })) }
      ),
    [qc]
  );

  const markRead = useCallback(
    (connectionId) => {
      qc.setQueryData(CONVERSATIONS_KEY, (list) => list?.map((t) => (t.connectionId === connectionId ? { ...t, unread: 0 } : t)));
      const socket = socketRef.current;
      if (socket?.connected) socket.emit('message:read', { connectionId });
      else markReadRest(connectionId).catch(() => {});
    },
    [qc]
  );

  const sendTyping = useCallback((connectionId, isTyping) => {
    socketRef.current?.emit('typing', { connectionId, isTyping });
  }, []);

  const setActiveThread = useCallback((connectionId) => {
    activeThreadRef.current = connectionId;
  }, []);

  const value = useMemo(
    () => ({
      connected,
      isOnline: (id) => online.has(id),
      isTyping: (connectionId) => Boolean(typing[connectionId]),
      sendMessage,
      discardFailed,
      markRead,
      sendTyping,
      setActiveThread,
    }),
    [connected, online, typing, sendMessage, discardFailed, markRead, sendTyping, setActiveThread]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
