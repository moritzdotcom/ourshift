import { AbsenceReason } from '@/generated/prisma';
import axios from 'axios';
import { useState } from 'react';

export default function useShiftAbsence(shift: {
  id: string;
  shiftAbsence: { reason: AbsenceReason; id: string } | null;
}) {
  const [shiftAbsence, setShiftAbsence] = useState(shift.shiftAbsence);

  async function createAbsence(reason: AbsenceReason) {
    const { data } = await axios.post('/api/shiftAbsence', {
      shiftId: shift.id,
      reason,
    });
    setShiftAbsence(data);
    return data;
  }

  async function deleteAbsence() {
    if (!shiftAbsence) return;
    await axios.delete(`/api/shiftAbsence/${shiftAbsence.id}`);
    setShiftAbsence(null);
  }

  return { shiftAbsence, createAbsence, deleteAbsence };
}
