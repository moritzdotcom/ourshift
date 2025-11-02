import {
  ApiGetKioskShiftResponse,
  ApiPostKioskShiftResponse,
} from '@/pages/api/kiosk/shift';
import { ApiPostKioskTakeoverResponse } from '@/pages/api/kiosk/takeover';
import { ApiGetKioskUsersResponse } from '@/pages/api/kiosk/users';
import axios from 'axios';
import useSWR from 'swr';

export type KioskShift = ApiGetKioskShiftResponse[number];
export type KioskUser = ApiGetKioskUsersResponse[number];

export default function useKioskData() {
  const shiftFetcher = () =>
    axios.get<KioskShift[]>('/api/kiosk/shift').then((res) => res.data);

  const { data: shifts, mutate: setShifts } = useSWR<KioskShift[]>(
    '/api/kiosk/shift',
    shiftFetcher,
    {
      refreshInterval: 5 * 60_000,
    }
  );

  const userFetcher = () =>
    axios.get<KioskUser[]>('/api/kiosk/users').then((res) => res.data);

  const { data: users, mutate: setUsers } = useSWR<KioskUser[]>(
    '/api/kiosk/users',
    userFetcher
  );

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
        setShifts(
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

  async function handleTakeover(shiftId: string, userId: string, pin: string) {
    try {
      const response = await axios.post<ApiPostKioskTakeoverResponse>(
        '/api/kiosk/takeover',
        { shiftId, userId, pin }
      );

      const { validPin, shift } = response.data;

      // Wenn PIN korrekt und Backend hat uns die neuen clockIn/clockOut Werte zurückgegeben:
      if (validPin && shift) {
        // mutate erlaubt uns, den aktuellen Cache zu patchen
        setShifts(
          (current) => {
            if (!current) return current;

            // wir mappen über die aktuelle Liste und ersetzen nur die eine Schicht
            return current.map((s) => {
              if (s.id !== shift.id) return s;

              return {
                ...s,
                user: shift.user,
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

  return {
    shifts: shifts ?? [],
    handlePunch,
    handleTakeover,
    users: users ?? [],
  };
}
