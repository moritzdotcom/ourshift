import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

export function usePushPrefs() {
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/push/hasToken');
      setHasToken(Boolean(data.hasToken));
      setPushEnabled(Boolean(data.pushEnabled));
    } finally {
      setLoading(false);
    }
  }, []);

  const setEnabled = useCallback(async (v: boolean) => {
    await axios.post('/api/push/prefs', { pushEnabled: v });
    setPushEnabled(v);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, hasToken, pushEnabled, refresh, setEnabled };
}
