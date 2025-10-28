import { User } from '@/generated/prisma';
import {
  ScrollArea,
  TextInput,
  Card,
  Group,
  Button,
  Badge,
  Stack,
  Text,
} from '@mantine/core';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import { useState, useMemo, Dispatch, SetStateAction } from 'react';
import UserModal from './userModal';
import { useDisclosure } from '@mantine/hooks';
import axios from 'axios';
import { ApiGetUsersResponse } from '@/pages/api/users';
import { showSuccess } from '@/lib/toast';

export default function DigitalContractsSidebar({
  users,
  activeUserId,
  setActiveUserId,
  setUsers,
}: {
  users: User[];
  activeUserId: string | null;
  setActiveUserId: (id: string) => void;
  setUsers: Dispatch<SetStateAction<ApiGetUsersResponse>>;
}) {
  const [query, setQuery] = useState('');
  const [opened, { open, close: closeModal }] = useDisclosure(false);

  const filtered = useMemo(
    () =>
      users.filter((u) =>
        `${u.firstName} ${u.lastName}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [users, query]
  );

  const activeUser = users.find((u) => u.id === activeUserId);

  async function handleCreate(
    user: Partial<User> & { password?: string; kioskPin?: string }
  ) {
    const { data } = await axios.post<User>('/api/users', user);
    showSuccess('Benutzer erstellt');
    setActiveUserId(data.id);
    closeModal();
    setUsers((us) => [...us, { ...data, contracts: [], payRules: [] }]);
  }

  return (
    <div className="h-full border-r border-slate-300 p-4 flex flex-col">
      <Stack gap="sm" className="flex-1">
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder="Mitarbeiter suchen…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
        <ScrollArea className="flex-1 min-h-0">
          <Stack gap="xs">
            {filtered.map((u) => (
              <Card
                key={u.id}
                withBorder
                onClick={() => setActiveUserId(u.id)}
                className={`cursor-pointer ${
                  activeUser?.id === u.id
                    ? '!inset-ring-2 inset-ring-emerald-500'
                    : ''
                }`}
              >
                <Group justify="space-between">
                  <div>
                    <div className="font-medium">
                      {u.firstName} {u.lastName}
                    </div>
                    <Text size="xs" c="dimmed">
                      {u.email || '—'}
                    </Text>
                  </div>
                  <Badge color={u.isActive ? 'green' : 'gray'}>
                    {u.isActive ? 'aktiv' : 'inaktiv'}
                  </Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        </ScrollArea>

        <Button leftSection={<IconPlus size={16} />} onClick={open}>
          Neuer Mitarbeiter
        </Button>

        <UserModal opened={opened} onClose={closeModal} onSave={handleCreate} />
      </Stack>
    </div>
  );
}
