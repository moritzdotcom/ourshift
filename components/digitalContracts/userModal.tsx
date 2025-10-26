import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  TextInput,
  Select,
  Switch,
  Group,
  Button,
  Alert,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { User } from '@/generated/prisma';
import { dateToISO } from '@/lib/dates';

type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export default function UserModal({
  opened,
  onClose,
  initial,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  initial?: User;
  onSave: (
    payload: Partial<User> & {
      id?: string;
      password?: string;
      kioskPin?: string;
    }
  ) => void;
}) {
  const isEdit = !!initial?.id;

  // ── State
  const [firstName, setFirstName] = useState(initial?.firstName || '');
  const [lastName, setLastName] = useState(initial?.lastName || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [role, setRole] = useState<Role>((initial?.role as Role) || 'EMPLOYEE');
  const [employeeNumber, setEmployeeNumber] = useState(
    initial?.employeeNumber || ''
  );
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);

  const [password, setPassword] = useState('');
  const [kioskPin, setKioskPin] = useState('');

  const [employmentStart, setEmploymentStart] = useState(
    dateToISO(initial?.employmentStart)
  );
  const [terminationDate, setTerminationDate] = useState(
    dateToISO(initial?.terminationDate)
  );

  // ── Refill wenn initial oder opened wechselt
  useEffect(() => {
    if (!opened) return;
    setFirstName(initial?.firstName || '');
    setLastName(initial?.lastName || '');
    setEmail(initial?.email || '');
    setPhone(initial?.phone || '');
    setRole((initial?.role as Role) || 'EMPLOYEE');
    setEmployeeNumber(initial?.employeeNumber || '');
    setIsActive(initial?.isActive ?? true);
    setPassword('');
    setKioskPin('');
    setEmploymentStart(dateToISO(initial?.employmentStart));
    setTerminationDate(dateToISO(initial?.terminationDate));
  }, [opened, initial]);

  // ── Validation
  const pinValid = useMemo(() => {
    if (!kioskPin) return true; // optional im Edit, required im Create
    return /^[0-9]{4,6}$/.test(kioskPin);
  }, [kioskPin]);

  const canSubmit = useMemo(() => {
    if (!firstName.trim() || !lastName.trim()) return false;
    if (!isEdit) {
      // Create: Passwort & PIN Pflicht
      if (!password.trim()) return false;
      if (!/^[0-9]{4,6}$/.test(kioskPin)) return false;
    } else {
      // Edit: Passwort & PIN optional, aber wenn PIN gesetzt, muss sie gültig sein
      if (kioskPin && !pinValid) return false;
    }
    return true;
  }, [firstName, lastName, password, kioskPin, pinValid, isEdit]);

  function handleSubmit() {
    if (!canSubmit) return;

    const payload: Partial<User> & {
      id?: string;
      password?: string;
      kioskPin?: string;
    } = {
      ...(isEdit ? { id: initial!.id } : {}),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email || null,
      phone: phone || null,
      role,
      isActive,
      employeeNumber: employeeNumber || null,
      employmentStart: employmentStart ? new Date(employmentStart) : new Date(),
      terminationDate: terminationDate ? new Date(terminationDate) : null,
    };

    // Nur mitsenden, wenn gesetzt (Edit optional)
    if (password.trim()) payload.password = password.trim();
    if (kioskPin) payload.kioskPin = kioskPin;

    onSave(payload);
    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Mitarbeiter bearbeiten' : 'Neuen Mitarbeiter anlegen'}
      size="lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextInput
          label="Vorname"
          value={firstName}
          onChange={(e) => setFirstName(e.currentTarget.value)}
          required
        />
        <TextInput
          label="Nachname"
          value={lastName}
          onChange={(e) => setLastName(e.currentTarget.value)}
          required
        />
        <TextInput
          label="E-Mail"
          value={email || ''}
          onChange={(e) => setEmail(e.currentTarget.value)}
          type="email"
        />
        <TextInput
          label="Telefon"
          value={phone || ''}
          onChange={(e) => setPhone(e.currentTarget.value)}
        />
        <Select
          label="Rolle"
          value={role}
          onChange={(v) => setRole((v as Role) || 'EMPLOYEE')}
          data={['ADMIN', 'MANAGER', 'EMPLOYEE']}
        />
        <TextInput
          label="Personalnummer"
          value={employeeNumber || ''}
          onChange={(e) => setEmployeeNumber(e.currentTarget.value)}
          placeholder="optional"
        />
        <TextInput
          label="Einstiegsdatum"
          type="date"
          value={employmentStart}
          onChange={(e) => setEmploymentStart(e.currentTarget.value)}
          required
        />
        <TextInput
          label="Kündigungsdatum (optional)"
          type="date"
          value={terminationDate}
          onChange={(e) => setTerminationDate(e.currentTarget.value)}
        />
        <div className="flex items-center md:col-span-2">
          <Switch
            label="Sichtbar im Schichtplan"
            checked={isActive}
            onChange={(e) => setIsActive(e.currentTarget.checked)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <TextInput
          label={isEdit ? 'Neues Passwort (optional)' : 'Passwort'}
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          type="password"
          required={!isEdit}
          placeholder={
            isEdit ? 'leer lassen, um Passwort nicht zu ändern' : undefined
          }
        />
        <TextInput
          label={
            isEdit
              ? 'Neue Kiosk-PIN (optional, 4-6 Ziffern)'
              : 'Kiosk-PIN (4-6 Ziffern)'
          }
          value={kioskPin}
          onChange={(e) =>
            setKioskPin(e.currentTarget.value.replace(/\D/g, ''))
          }
          maxLength={6}
          required={!isEdit}
          error={
            kioskPin && !pinValid ? 'PIN muss 4-6 Ziffern enthalten' : undefined
          }
          placeholder={
            isEdit ? 'leer lassen, um PIN nicht zu ändern' : undefined
          }
        />
      </div>

      <Group justify="end" mt="md">
        <Button variant="default" onClick={onClose}>
          Abbrechen
        </Button>
        <Button disabled={!canSubmit} onClick={handleSubmit}>
          Speichern
        </Button>
      </Group>
    </Modal>
  );
}
