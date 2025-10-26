import { ApiGetCurrentUser } from '@/pages/api/auth/me';
import axios from 'axios';
import useSWR from 'swr';

export function useCurrentUser() {
  const fetcher = (url: string) =>
    axios.get<ApiGetCurrentUser>(url).then((r) => r.data);
  const { data, error, isLoading, mutate } = useSWR('/api/auth/me', fetcher);

  return {
    user: data || null,
    loading: isLoading,
    error: error
      ? error.response?.status === 401
        ? 'unauthorized'
        : 'failed'
      : null,
    refetch: mutate,
  };
}
