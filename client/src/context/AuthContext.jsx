import { createContext, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as AuthApi from '../api/auth.js';

export const AuthContext = createContext(null);

export const ME_KEY = ['auth', 'me'];

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ME_KEY, queryFn: AuthApi.fetchMe, staleTime: 5 * 60 * 1000 });

  const onAuthed = (user) => qc.setQueryData(ME_KEY, user);
  const loginM = useMutation({ mutationFn: AuthApi.login, onSuccess: onAuthed });
  const registerM = useMutation({ mutationFn: AuthApi.register, onSuccess: onAuthed });
  const logoutM = useMutation({
    mutationFn: AuthApi.logout,
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(ME_KEY, null);
    },
  });

  const value = useMemo(
    () => ({
      user: me.data ?? null,
      isLoading: me.isLoading,
      login: loginM.mutateAsync,
      register: registerM.mutateAsync,
      logout: logoutM.mutateAsync,
    }),
    [me.data, me.isLoading, loginM.mutateAsync, registerM.mutateAsync, logoutM.mutateAsync]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
