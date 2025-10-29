import {
  ApiGetKioskShiftResponse,
  ApiPostKioskShiftResponse,
} from '@/pages/api/kiosk/shift';
import axios from 'axios';
import useSWR from 'swr';

export type KioskShift = ApiGetKioskShiftResponse[number];

export default function useKioskData() {
  const fetcher = () =>
    axios.get<KioskShift[]>('/api/kiosk/shift').then((res) => res.data);

  const { data, mutate } = useSWR<KioskShift[]>('/api/kiosk/shift', fetcher, {
    refreshInterval: 5 * 60_000,
  });

  /**
   * Versucht für eine bestimmte Schicht (shiftId) die PIN zu stempeln.
   * - Wenn PIN korrekt:
   *    - clockIn / clockOut im lokalen SWR-Cache aktualisieren
   *    - true zurückgeben
   * - Wenn PIN falsch: false zurückgeben
   */
  async function handlePunch(shiftId: string, pin: string) {
    try {
      const response = await axios.post<ApiPostKioskShiftResponse>(
        '/api/kiosk/shift',
        { shiftId, pin }
      );

      const { validPin, shift } = response.data;

      // Wenn PIN korrekt und Backend hat uns die neuen clockIn/clockOut Werte zurückgegeben:
      if (validPin && shift) {
        // mutate erlaubt uns, den aktuellen Cache zu patchen
        mutate(
          (current) => {
            if (!current) return current;

            // wir mappen über die aktuelle Liste und ersetzen nur die eine Schicht
            return current.map((s) => {
              if (s.id !== shift.id) return s;

              return {
                ...s,
                clockIn: shift.clockIn,
                clockOut: shift.clockOut,
              };
            });
          },
          { revalidate: false } // kein sofortiger Refetch; wir vertrauen der Response
        );
      }

      return { validPin: Boolean(validPin), error: null };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error('API error:', error.response.data);
        return {
          validPin: null,
          error: error.response.data.error || 'Unbekannter Fehler',
        };
      } else {
        console.error('Unexpected error:', error);
        return { validPin: null, error: 'Unbekannter Fehler' };
      }
    }
  }

  return { shifts: data ?? [], handlePunch };
}
