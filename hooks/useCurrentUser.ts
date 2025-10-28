import { ApiGetCurrentUser } from '@/pages/api/auth/me';
import axios from 'axios';
import useSWR from 'swr';

export function useCurrentUser() {
  const fetcher = (url: string) =>
    axios.get<ApiGetCurrentUser>(url).then((r) => r.data);
  const { data, error, isLoading, mutate } = useSWR('/api/auth/me', fetcher);

  async function update(updatedUser: Partial<ApiGetCurrentUser>) {
    if (!data) return;
    const newUser = { ...data, ...updatedUser };
    await axios.put('/api/auth/me', newUser);
    await mutate(newUser, false);
  }

  async function logout() {
    await axios.post('/api/auth/logout');
    await mutate(undefined, false);
    window.location.href = '/auth/logout';
  }

  async function updateCredentials({
    currentPassword,
    newPassword,
    newPin,
  }: {
    currentPassword?: string;
    newPassword?: string;
    newPin?: string;
  }) {
    await axios.put('/api/userCredentials', {
      currentPassword,
      newPassword,
      newPin,
    });
  }

  return {
    user: data || null,
    loading: isLoading,
    error: error
      ? error.response?.status === 401
        ? 'unauthorized'
        : 'failed'
      : null,
    refetch: mutate,
    update,
    logout,
    updateCredentials,
  };
}
