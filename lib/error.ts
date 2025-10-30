import { AxiosError } from 'axios';

export function axiosErrorToString(err: AxiosError<{ error: string }>) {
  return err.response?.data?.error || 'Unbekannter Fehler';
}
